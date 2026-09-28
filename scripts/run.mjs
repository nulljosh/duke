// One Playwright runner for every Duolingo track.
//   node run.mjs <track>      es | el | zu | ... (any language code) | math | chess | music
//
// Launches a persistent Chromium (.pw-profile), sets the jwt_token cookie
// from scripts/jwt.txt, PATCHes the account's active course, opens /lesson
// (or clicks the START node on /learn), injects the solver, and loops:
// solve one challenge, click through end screens, handle stories, skip
// DuoRadio, reopen. Rotates to the least-XP language automatically when a
// language tree is exhausted.
//
// Language / chess / music load scripts/solver.js. Math loads
// scripts/math.js (former duo.js, pruned 2026-09-09 by hit-trace — see
// CLAUDE.md) plus scripts/mathjs.min.js, and drives it through autoLesson().
//
// Logs: scripts/log.jsonl (one line per event), scripts/state.json (summary),
// scripts/lessons.jsonl (language study ledger: prompt + answer per question).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { courseIdFor } from './courseId.mjs';
import { rateLimited as rateLimitedGuard, isValidTrack, shouldRotateLog, cycleDue as cycleDueGuard, nextInRotation as nextInRotationGuard, courseComplete, stallAction, repeatedChallenge, summarizePath, leastComplete, trackForCourseId } from './guards.mjs';

const D = path.dirname(new URL(import.meta.url).pathname);
let track = process.argv[2];
if (!track) { console.error('usage: node run.mjs <track>   (a language code, math, chess, or music)'); process.exit(1); }
let isMath = track === 'math';
let isChessTrack = track === 'chess';
let pendingTrack = null; // set by POST /switch, picked up at the top of the outer loop
let paused = false; // set by POST /pause and /resume, checked at the top of the outer loop
// set by POST /voice, read out loud as questions/answers land — seeded from
// the last saved state.json so a runner restart (crash, or a code deploy)
// doesn't silently flip the menu-bar toggle back off underneath the user.
let voiceOn = false;
try { voiceOn = !!JSON.parse(fs.readFileSync(path.join(D, 'state.json'), 'utf8')).voiceOn; } catch {}

// ponytail: stdlib http, no deps — lets the status apps poll over LAN or the
// Cloudflare Tunnel. Reads are open (worst case someone sees a chess score);
// the mutating routes are not, because this hostname is on the public internet
// and pause/resume/switch are things a stranger could actually mess with.
// Token lives in scripts/api-token.txt (gitignored), generated on first run.
const TOKEN_PATH = path.join(D, 'api-token.txt');
let apiToken;
try {
  apiToken = fs.readFileSync(TOKEN_PATH, 'utf8').trim();
} catch {
  apiToken = crypto.randomBytes(24).toString('base64url');
  fs.writeFileSync(TOKEN_PATH, apiToken + '\n', { mode: 0o600 });
  console.log(`Generated API token for the mutating routes -> ${TOKEN_PATH}\n  ${apiToken}\n  Paste this into the status app's settings.`);
}
const authed = req => (req.headers['x-pwnlingo-token'] || '') === apiToken;

// ponytail: /screenshot is a live picture of whatever the runner's browser is
// showing, so it gets the token too — the rest of the reads are just a score.
// Plus a crude global rate limit: a stranger who finds the hostname shouldn't
// be able to make this Mac render JPEGs as fast as they can ask. One counter,
// no per-IP bookkeeping — behind a tunnel every request looks the same anyway.
// Each client polls state+log+fen(+screenshot) every 3s, so roughly 13 req per
// window per client. 120 leaves room for all four apps open at once and still
// caps a stranger at ~12 req/sec.
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 120;
const rateWindow = { start: Date.now(), count: 0 };
const rateLimited = () => rateLimitedGuard(rateWindow, Date.now(), RATE_WINDOW_MS, RATE_MAX);

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'X-Pwnlingo-Token');
  if (rateLimited()) { res.writeHead(429); res.end('{"ok":false,"err":"slow down"}'); return; }
  // ponytail: a request landing during the startup window (before page/fen/etc
  // below finish initializing) threw a TDZ ReferenceError synchronously inside
  // this handler, which crashed the whole process — not just that one request.
  // One try/catch around the whole router turns "process dies" into "503".
  try {
  if (req.url === '/state') {
    res.setHeader('Content-Type', 'application/json');
    if (!fs.existsSync(path.join(D, 'state.json'))) { res.writeHead(503); res.end(); return; }
    const raw = fs.readFileSync(path.join(D, 'state.json'), 'utf8').toString();
    // ponytail: reads stay open so every client keeps working without a token,
    // but this hostname is on the public internet via the tunnel and the payload
    // has grown past "a chess score". Only `username` actually identifies the
    // account, so only that is withheld — stripping streak/league too would
    // regress the tui and KMP clients, which send no token and show them.
    if (authed(req)) { res.end(raw); return; }
    try {
      const { username, ...rest } = JSON.parse(raw);
      res.end(JSON.stringify(rest));
    } catch { res.end(raw); }
  } else if (req.url === '/log') {
    const lines = fs.existsSync(path.join(D, 'log.jsonl'))
      ? fs.readFileSync(path.join(D, 'log.jsonl'), 'utf8').trim().split('\n').slice(-50) : [];
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)));
  } else if (req.method === 'POST' && /^\/(switch|pause|resume|quit|cycle)/.test(req.url) && !authed(req)) {
    res.writeHead(401); res.end('{"ok":false,"err":"bad or missing X-Pwnlingo-Token"}');
  } else if (req.method === 'POST' && req.url.startsWith('/switch')) {
    // Token-gated already, so this is just a sanity check: a track is a short
    // alphanumeric code (a language code, or math/chess/music), nothing else.
    const t = new URL(req.url, 'http://x').searchParams.get('track');
    // A manual switch means "play this one" — any auto-switching (timer rotation
    // OR balance mode) would otherwise pull it back within minutes and make the
    // click look like it did nothing. Turn it off so a manual pick sticks; the
    // app's own Auto-switch picker turns it back on.
    if (isValidTrack(t)) { pendingTrack = t; cycle.enabled = false; saveCycle(); res.end('{"ok":true}'); } else { res.writeHead(400); res.end('{"ok":false}'); }
  } else if (req.method === 'GET' && req.url === '/cycle') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(cycle));
  } else if (req.method === 'POST' && req.url.startsWith('/cycle')) {
    const q = new URL(req.url, 'http://x').searchParams;
    const mode = q.get('mode');
    const value = Number(q.get('value'));
    if (q.get('enabled') != null) cycle.enabled = q.get('enabled') === 'true';
    if (mode === 'time' || mode === 'count' || mode === 'balance') cycle.mode = mode;
    const scope = q.get('scope');
    if (scope === 'core' || scope === 'all') cycle.scope = scope;
    if (Number.isFinite(value) && value > 0) cycle.value = value;
    cycle.lastAt = Date.now(); cycle.sinceCount = 0; saveCycle();
    res.end(JSON.stringify(cycle));
  } else if (req.method === 'POST' && req.url.startsWith('/pause')) {
    paused = true; S.paused = true; saveState(); res.end('{"ok":true}');
  } else if (req.method === 'POST' && req.url.startsWith('/resume')) {
    paused = false; S.paused = false; saveState(); res.end('{"ok":true}');
  } else if (req.method === 'POST' && req.url.startsWith('/voice')) {
    const on = new URL(req.url, 'http://x').searchParams.get('on');
    voiceOn = on === 'true' || on === '1'; S.voiceOn = voiceOn; saveState();
    res.end(JSON.stringify({ ok: true, voiceOn, canSpeak }));
  } else if (req.method === 'POST' && req.url.startsWith('/quit')) {
    res.end('{"ok":true}'); setTimeout(() => process.exit(0), 100);
  } else if (req.url.startsWith('/fen')) {
    // ponytail: reuses the same liveFen() the chess-move planner already calls
    fen().then(f => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ fen: f }));
    }).catch(() => { res.writeHead(503); res.end(); });
  } else if (req.url.startsWith('/screenshot') && !authed(req)) {
    res.writeHead(401); res.end('{"ok":false,"err":"bad or missing X-Pwnlingo-Token"}');
  } else if (req.url.startsWith('/screenshot')) {
    // ponytail: reuses the live page, no separate headful/video pipeline. Clip
    // to the challenge widget itself (same container hasChallenge() checks) so
    // math/story previews read like a clean crop, not Duolingo's full chrome —
    // the closest a screenshot gets to how ChessBoardView renders just the board.
    page.evaluate(() => {
      const el = document.querySelector('[data-test^="challenge "], [data-test="stories-element"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
    }).catch(() => null).then(clip => page.screenshot({ type: 'jpeg', quality: 60, ...(clip && clip.width > 0 && clip.height > 0 ? { clip } : {}) })).then(buf => {
      res.setHeader('Content-Type', 'image/jpeg');
      res.end(buf);
    }).catch(() => { res.writeHead(503); res.end(); });
  } else { res.writeHead(404); res.end(); }
  } catch (e) { if (!res.headersSent) { res.writeHead(503); res.end(); } }
}).on('error', (e) => {
  // Witnessed: starting a second runner crashed the whole process with an
  // unhandled 'error' event and a raw stack. Say what's wrong and stop.
  if (e.code === 'EADDRINUSE') { console.error('Port 8737 is already in use — another runner is running. Stop it first (lsof -ti:8737 | xargs kill).'); process.exit(1); }
  console.error('HTTP server error:', e); process.exit(1);
}).listen(8737, '0.0.0.0');

// ponytail: the session lives in the persistent Chromium profile (.pw-profile),
// which Duolingo refreshes on its own — the cookie currently on disk is good for
// a year. jwt.txt is only a bootstrap for a machine that has no profile yet, so
// a missing one is not fatal; `uid` comes from whichever cookie ends up live.
// (A missing jwt.txt used to throw here and kill the runner on a fresh clone.)
let bootstrapJwt = null;
try { bootstrapJwt = fs.readFileSync(path.join(D, 'jwt.txt'), 'utf8').trim() || null; } catch { /* profile-only is fine */ }
let uid = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOG_PATH = path.join(D, 'log.jsonl');
// ponytail: unattended runs (hours/days over the public tunnel) would let this
// grow forever otherwise. Keep only the most recent ~5000 lines once the file
// crosses 5MB — /log only ever serves the last 50 anyway, so nothing useful
// is lost, and this needs no cron/launchd entry, just a check on each write.
const rotateIfNeeded = (file, keep = 5000) => {
  try {
    if (!shouldRotateLog(fs.statSync(file).size, 5 * 1024 * 1024)) return;
    const all = fs.readFileSync(file, 'utf8').trim().split('\n');
    // ponytail: ledgers feed Lexly imports, so trimmed lines go to <file>.archive instead of the void.
    fs.appendFileSync(file.replace(/\.jsonl$/, '.archive.jsonl'), all.slice(0, -keep).join('\n') + '\n');
    fs.writeFileSync(file, all.slice(-keep).join('\n') + '\n');
  } catch (e) { /* file may not exist yet — nothing to rotate */ }
};
const rotateLogIfNeeded = () => rotateIfNeeded(LOG_PATH);
let lastLogAt = Date.now();
const log = o => { lastLogAt = Date.now(); fs.appendFileSync(LOG_PATH, JSON.stringify({ at: new Date().toISOString(), track, ...o }) + '\n'); rotateLogIfNeeded(); };
const S = { started: new Date().toISOString(), track, username: null, paused: false, voiceOn, streak: null, xpGoal: null, xpGoalMetToday: null, hearts: null, maxHearts: null, league: null, lessons: 0, puzzles: 0, matches: 0, misses: 0, xp0: null, xp: null, xpToday: null, last: null, puzzleStep: null, puzzleTotal: null, progress: null };
// ponytail: xp0 is captured at PROCESS start, so "+N XP" silently resets on
// every restart — it read +70 while the day's real gain was +345. Duolingo's
// own unit is the day (streak, daily goal), so track that too and persist it.
// Local date, not UTC: the day rolls over when Duolingo says it does.
const XPDAY_PATH = path.join(D, 'xpday.json');
const localDay = () => new Date().toLocaleDateString('en-CA');
let xpDay = { date: localDay(), startXp: null };
try { xpDay = { ...xpDay, ...JSON.parse(fs.readFileSync(XPDAY_PATH, 'utf8')) }; } catch {}
const noteXp = (xp) => {
  if (xp == null) return;
  if (xpDay.date !== localDay() || xpDay.startXp == null) {
    xpDay = { date: localDay(), startXp: xp };
    try { fs.writeFileSync(XPDAY_PATH, JSON.stringify(xpDay)); } catch {}
  }
  S.xpToday = Math.max(0, xp - xpDay.startXp);
};
const saveState = () => { noteXp(S.xp); fs.writeFileSync(path.join(D, 'state.json'), JSON.stringify({ at: new Date().toISOString(), ...S }, null, 1)); };
// Both ledgers rotate on the same 5MB rule as log.jsonl — they used to grow
// forever, which at ~22 levels/hour running unattended is real disk over weeks.
const LESSONS_PATH = path.join(D, 'lessons.jsonl');
const ledger = rows => { if (!rows.length) return; fs.appendFileSync(LESSONS_PATH, rows.map(r => JSON.stringify(r)).join('\n') + '\n'); rotateIfNeeded(LESSONS_PATH); };
// ponytail: language gets lessons.jsonl (prompt+answer per question) but chess
// puzzles only ever lived in log.jsonl, which rotates at 5MB / keeps ~5000
// lines — same permanent record language gets, chess never had one.
const PUZZLES_PATH = path.join(D, 'puzzles.jsonl');
const puzzleLedger = row => { fs.appendFileSync(PUZZLES_PATH, JSON.stringify(row) + '\n'); rotateIfNeeded(PUZZLES_PATH); };

// self-calibrating promotion-picker slot: {piece: slotIndex}, learned by trial when the
// guessed 'qrbn' order fails a graded puzzle, persisted so it sticks across runs.
const CALIB_PATH = path.join(D, 'promo-calib.json');
let promoCalib = {}; try { promoCalib = JSON.parse(fs.readFileSync(CALIB_PATH, 'utf8')); } catch {}
const saveCalib = () => fs.writeFileSync(CALIB_PATH, JSON.stringify(promoCalib));

// ponytail: disabled-by-default topic variance. Rotation order is fixed —
// chess, math, then every language in the app's own picker order — rather
// than configurable, since the ask was "some variance," not a playlist
// editor. music is excluded: no known challenge shapes yet (roadmap.md),
// so it would just churn on the 15s detect-timeout every rotation.
const LANGUAGE_CODES = ['es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'ru', 'ar', 'hi', 'nl', 'sv', 'tr', 'el', 'pl', 'cy', 'ga', 'hu', 'da', 'id', 'vi', 'uk', 'ro', 'cs', 'he', 'yi', 'sw', 'hw', 'la', 'eo', 'zu', 'gd', 'fi', 'tl', 'ht', 'gn', 'nv'];
const ROTATION = ['chess', 'math', ...LANGUAGE_CODES];
const CYCLE_PATH = path.join(D, 'cycle.json');
let cycle = { enabled: true, mode: 'balance', scope: 'all', value: 20, sinceCount: 0, lastAt: Date.now() };
try {
  const saved = JSON.parse(fs.readFileSync(CYCLE_PATH, 'utf8'));
  // A file with no `scope` was written before balance mode existed. Its
  // enabled/mode values describe a feature that has since been replaced, so
  // adopting them would silently leave the new default (balance, on) switched
  // off. Migrate once; every choice made after this point is honoured.
  cycle = 'scope' in saved ? { ...cycle, ...saved } : { ...cycle, value: saved.value ?? cycle.value };
} catch {}
// Persist immediately so the file stops looking like the pre-balance format
// (and so `cat cycle.json` tells the truth about what the runner is doing).
try { fs.writeFileSync(CYCLE_PATH, JSON.stringify(cycle)); } catch {}
const saveCycle = () => fs.writeFileSync(CYCLE_PATH, JSON.stringify(cycle));
const bumpCycleCount = () => { if (cycle.enabled && cycle.mode === 'count') { cycle.sinceCount++; saveCycle(); } };
const cycleDue = () => cycleDueGuard(cycle, Date.now());
const nextInRotation = t => nextInRotationGuard(ROTATION, t);

// Voice mode: "Speak this sentence" challenges have no skip button and used
// to strand the runner for its full 20-min ceiling (see the quiet-cycle
// comment below). The answer text is already known — it's the sentence
// Duolingo displays, same as any other challenge's answer key — so instead
// of guessing at speech, we say it: macOS `say` renders the exact prompt to
// a wav, and Chromium's fake-audio-capture flag feeds that wav back as the
// mic input Duolingo's own recognizer grades.
const VOICE_WAV = path.join(D, 'voice.wav');
const execFileP = promisify(execFile);
const canSpeak = process.platform === 'darwin';
async function synthSpeech(text) {
  const aiff = VOICE_WAV.replace(/\.wav$/, '.aiff');
  await execFileP('say', ['-o', aiff, text]);
  await execFileP('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', aiff, VOICE_WAV]);
}

// Narration mode: read the question and answer out loud as they land, for a
// machine that's just sitting on the desk running unattended anyway. Off by
// default, toggled from the status app (POST /voice). Fire-and-forget `say`
// straight to the real speakers — unrelated to synthSpeech()/VOICE_WAV above,
// which feeds Chromium's fake mic instead. Queued: macOS's `say` already
// serializes overlapping calls onto one voice, so two speakOut()s back to
// back just read one after the other instead of talking over themselves.
function speakOut(text) {
  if (!canSpeak || !voiceOn || !text) return;
  // `say` reads em/en dashes as a literal pause artifact, not punctuation —
  // dash-joined prompt/answer pairs (see the pairs.join('. ') callsite) sound
  // like a glitch, so normalize them to a period the way `say` actually speaks.
  const clean = String(text).replace(/[–—]/g, '.').slice(0, 500);
  try { execFile('say', [clean], () => {}); } catch {}
}

// the fake-audio-capture flag needs the file to exist at launch; content gets
// overwritten per-question below, chromium re-reads it fresh each capture.
if (canSpeak && !fs.existsSync(VOICE_WAV)) await synthSpeech('placeholder').catch(() => {});

const ctx = await chromium.launchPersistentContext(path.join(D, '.pw-profile'), {
  headless: true, viewport: { width: 1400, height: 900 },
  args: [
    '--disable-background-timer-throttling',
    ...(canSpeak ? [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${VOICE_WAV}`,
    ] : []),
  ],
});
if (canSpeak) await ctx.grantPermissions(['microphone'], { origin: 'https://www.duolingo.com' });
if (bootstrapJwt) {
  await ctx.addCookies([{ name: 'jwt_token', value: bootstrapJwt, domain: '.duolingo.com', path: '/', secure: true, sameSite: 'Lax' }]);
}
// Whatever is live now — the bootstrap we just injected, or the one the profile
// already carried from a previous run — is the session this process will use.
const liveJwt = (await ctx.cookies('https://www.duolingo.com')).find(c => c.name === 'jwt_token')?.value || null;
if (!liveJwt) {
  console.error(
    'No Duolingo session.\n' +
    '  This machine has no signed-in browser profile (scripts/.pw-profile) and no scripts/jwt.txt.\n' +
    '  Fix either way:\n' +
    '    - log in once: node scripts/login.mjs   (opens a real browser, session persists after)\n' +
    '    - or paste a jwt_token cookie into scripts/jwt.txt'
  );
  await ctx.close();
  process.exit(1);
}
try {
  uid = JSON.parse(Buffer.from(liveJwt.split('.')[1], 'base64').toString()).sub;
} catch {
  console.error('Session cookie is not a readable JWT — re-run scripts/login.mjs.');
  await ctx.close();
  process.exit(1);
}
let page = ctx.pages()[0] || await ctx.newPage();

const inject = async () => {
  // mathjs (local bundle, no network dependency) replaces the hand-rolled
  // LaTeX-expression evaluator in compile() — load it first so `math` is
  // defined before the solver's top-level script runs.
  const files = isMath ? ['mathjs.min.js', 'math.js'] : isChessTrack ? ['solver.js', 'js-chess-engine.js'] : ['solver.js'];
  for (const f of files) await page.addScriptTag({ content: fs.readFileSync(path.join(D, f), 'utf8') });
  await page.evaluate(v => { window.__isChessTrack = v; }, isChessTrack);
  await page.evaluate(v => { window.__canSpeak = v; }, canSpeak);
  if (isChessTrack) await page.evaluate(c => { window.__duo.promoCalib = c; }, promoCalib);
};
const xp = () => page.evaluate(async u => { try { return (await (await fetch(`/2017-06-30/users/${u}?fields=totalXp`)).json()).totalXp; } catch (e) { return null; } }, uid);
const username = () => page.evaluate(async u => { try { return (await (await fetch(`/2017-06-30/users/${u}?fields=username`)).json()).username; } catch (e) { return null; } }, uid);
const stats = () => page.evaluate(async u => {
  try {
    const j = await (await fetch(`/2017-06-30/users/${u}?fields=streak,xpGoal,xpGoalMetToday,health,trackingProperties`)).json();
    return {
      streak: j.streak ?? null, xpGoal: j.xpGoal ?? null, xpGoalMetToday: j.xpGoalMetToday ?? null,
      hearts: j.health?.hearts ?? null, maxHearts: j.health?.maxHearts ?? null,
      league: j.trackingProperties?.leaderboard_league ?? null, // was already in the payload, unused
    };
  } catch (e) { return null; }
}, uid);
// ponytail: course completion is real data, not a guess — /courses/<id> returns
// pathSectioned, every section carrying completedUnits/totalUnits and every level
// carrying a state ('passed' | 'active' | 'locked' | 'unit_test'). Works for any
// track, because the course id comes from courseIdFor() the same as setCourse().
// Caveat worth knowing: totalLevels grows when Duolingo ships a new section, so
// 100% is a moving target — the percentage is honest for the tree as it stands.
// The browser only fetches and TRIMS (the raw payload carries megabytes of
// per-level chess/lesson metadata). The counting itself happens in Node via
// summarizePath(), so the logic that decides "this course is finished" — which
// is allowed to switch tracks — is the same code the tests exercise, instead of
// a copy of it living out of reach inside page.evaluate.
const fetchPath = (t) => page.evaluate(async ({ u, cid }) => {
  try {
    const r = await fetch(`/2017-06-30/users/${u}/courses/${cid}`);
    if (!r.ok) return null;
    const j = await r.json();
    const secs = j.pathSectioned || [];
    if (!secs.length) return null;
    // Same shape as the real payload, just without the metadata.
    return secs.map((s) => ({
      completedUnits: s.completedUnits || 0,
      totalUnits: s.totalUnits || 0,
      units: (s.units || []).map((u2) => ({ levels: (u2.levels || []).map((lv) => ({ state: lv.state })) })),
    }));
  } catch (e) { return null; }
}, { u: uid, cid: courseIdFor(t) }).catch(() => null);
const progress = async (t) => summarizePath(await fetchPath(t));

// ---- balance mode -----------------------------------------------------------
// A course's completion can be read WITHOUT switching to it (verified: read
// MATH_BT while CHESS_CH was the active course), which is the whole reason this
// can work at all. Candidates are polled a couple at a time, round-robin, so a
// full picture builds up in the background instead of 27 API calls at once.
//
// Scope: 'all' (the default) means exactly what it says — every enrolled course
// competes, so the languages sitting at 0.1-2.8% get played long before chess
// (70%) or math (75.5%) come up again. That is the point of balancing: nothing
// is starved because it started late. The margin keeps it from flapping between
// languages that are effectively tied, so it plays one for hours before moving
// on. 'core' narrows it to chess+math for when you want those two finished.
const CORE_TRACKS = ['chess', 'math'];
let enrolledTracks = [];   // filled once at startup from the account's course list
const trackPct = new Map();          // track -> percent complete
const trackRemaining = new Map();    // track -> levels left, so a nearly-done course can jump the queue
const trackPolledAt = new Map();     // track -> when we last asked
// Epoch, not now: the dwell window exists to stop flip-flopping between two
// near-equal tracks, not to make a fresh start ignore a track that is clearly
// behind for the first 20 minutes.
let lastBalanceSwitchAt = 0;
let sweptOnce = false;   // full candidate sweep on the first balance evaluation

// Tracks that proved unplayable this run. Without this, a stalled track that is
// also the nearest to done (English, six speaking levels short) gets re-picked
// the moment we switch away from it, forever.
// Persisted, because without it every restart re-learns the same lesson the
// slow way: balance picks the nearest-done track, spends half an hour proving
// it is unplayable, blacklists it, and forgets again on the next start.
// Entries expire so a one-off stall (a flaky lesson, a bad night) is not a
// permanent ban — Duolingo content does change.
const STALLED_PATH = path.join(D, 'stalled.json');
const STALL_TTL_MS = 24 * 3600e3;
const stalledTracks = new Set();
let stalledUntil = {};
try {
  stalledUntil = JSON.parse(fs.readFileSync(STALLED_PATH, 'utf8'));
  for (const [t, until] of Object.entries(stalledUntil)) if (until > Date.now()) stalledTracks.add(t);
} catch {}
const markStalled = (t) => {
  stalledTracks.add(t);
  stalledUntil = { ...stalledUntil, [t]: Date.now() + STALL_TTL_MS };
  try { fs.writeFileSync(STALLED_PATH, JSON.stringify(stalledUntil)); } catch {}
};
const balanceCandidates = () =>
  (cycle.scope === 'all' ? [...CORE_TRACKS, ...enrolledTracks] : CORE_TRACKS)
    .filter((t) => !stalledTracks.has(t));

const pollCandidates = async (n = 2) => {
  const due = balanceCandidates()
    .filter((t) => t !== track)   // the active track is refreshed by refreshProgress()
    .sort((a, b) => (trackPolledAt.get(a) || 0) - (trackPolledAt.get(b) || 0))
    .slice(0, n);
  for (const t of due) {
    trackPolledAt.set(t, Date.now());
    const p = await progress(t);
    if (p) { trackPct.set(t, Math.round((p.passed / p.total) * 1000) / 10); trackRemaining.set(t, p.total - p.passed); }
  }
};

// Rate is MEASURED, never assumed: anchor the first sample of this run, then
// extrapolate from levels actually passed since. Resets on a track switch,
// because a chess rate says nothing about how fast a language tree moves.
const PROGRESS_EVERY_MS = 5 * 60e3;
let progressAnchor = null;   // { at, passed, track }
let lastProgressAt = 0;
// Not persisted on purpose: a restart on a finished track SHOULD re-detect the
// completion and advance again, rather than sit there grinding a done tree.
const completedTracks = new Set();
// Largest level count ever seen per track. A real tree only grows (Duolingo
// ships new sections); a payload that comes back smaller is partial, and
// courseComplete() refuses to call that a finish.
const progressPeak = new Map();
const refreshProgress = async (force = false) => {
  if (!force && Date.now() - lastProgressAt < PROGRESS_EVERY_MS) return;
  lastProgressAt = Date.now();
  const p = await progress(track);
  if (!p) { S.progress = null; return; }
  // A short payload would otherwise drag the percentage backwards and (worse)
  // look like a finish. Keep the last good numbers and wait for the next poll.
  const peak = progressPeak.get(track) || 0;
  if (p.total < peak) { log({ ev: 'progress-partial', track, total: p.total, peak }); return; }
  progressPeak.set(track, p.total);
  if (!progressAnchor || progressAnchor.track !== track) {
    progressAnchor = { at: Date.now(), passed: p.passed, track };
  }
  const hours = (Date.now() - progressAnchor.at) / 3600e3;
  const gained = p.passed - progressAnchor.passed;
  // Need a real sample before quoting an ETA — a few minutes and at least one
  // level, otherwise the first tick would divide by ~0 and print a wild number.
  const rate = (hours >= 0.05 && gained > 0) ? gained / hours : null;
  const remaining = p.total - p.passed;
  S.progress = {
    ...p,
    pct: Math.round(p.passed / p.total * 1000) / 10,
    remaining,
    levelsPerHour: rate ? Math.round(rate * 10) / 10 : null,
    etaHours: rate ? Math.round(remaining / rate * 10) / 10 : null,
  };
  trackPct.set(track, S.progress.pct);
  trackRemaining.set(track, remaining);
  trackPolledAt.set(track, Date.now());

  // Balance mode: keep a background read on the other candidates, then play
  // whichever is furthest behind. Auto-advance below still wins on a 100% —
  // that one is a correctness guard (a finished tree serves nothing), not a
  // preference, so it applies in every mode.
  if (cycle.enabled && cycle.mode === 'balance') {
    // One full sweep up front, round-robin after. Discovering two courses per
    // five minutes meant the first hour of decisions was made on a fraction of
    // the picture — it would happily grind Klingon while not yet knowing English
    // was six levels from finished. 27 sequential reads take about half a minute.
    if (!sweptOnce) { sweptOnce = true; await pollCandidates(balanceCandidates().length); }
    else await pollCandidates();
    S.balance = { scope: cycle.scope, pcts: Object.fromEntries(trackPct) };
    const behind = leastComplete(S.balance.pcts, track, { now: Date.now(), lastSwitchAt: lastBalanceSwitchAt, remaining: Object.fromEntries(trackRemaining) });
    if (behind && behind !== track) {
      log({ ev: 'balance-switch', from: track, track: behind, pcts: S.balance.pcts });
      lastBalanceSwitchAt = Date.now();
      pendingTrack = behind;
    }
  } else {
    S.balance = null;
  }
  saveState();

  // ponytail: a finished tree has nothing left to serve — grinding it forever is
  // the one thing worse than stopping. On 100%, move to the next unfinished
  // track in ROTATION (chess -> math -> languages, which is already the order).
  // Only ever fires on a real, complete payload: a failed fetch returns null
  // above and never reaches here, so a network blip can't fake a completion.
  if (courseComplete(p, progressPeak.get(track) || 0)) {
    if (!completedTracks.has(track)) {
      completedTracks.add(track);
      log({ ev: 'track-complete', track, passed: p.passed, total: p.total });
    }
    // Walk forward for the first track we haven't already seen finished, so a
    // fully-finished rotation parks instead of switching in a tight circle.
    let next = nextInRotation(track);
    for (let i = 0; i < ROTATION.length && completedTracks.has(next); i++) next = nextInRotation(next);
    if (completedTracks.has(next)) log({ ev: 'all-complete' });
    else if (next !== track) { pendingTrack = next; log({ ev: 'auto-advance', from: track, track: next }); }
  }
};

// held click: instant down/up is ignored by the Rive chess board
const click = async ([x, y]) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(90); await page.mouse.up(); await sleep(550); };
const fen = () => page.evaluate(() => { try { return __duo.liveFen(); } catch (e) { return null; } });
// a chess move: select + drop with a held click, drag as fallback, verify via live FEN change
const chessMove = async (pts) => {
  const [a, b, promo] = pts;
  const before = await fen();
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt % 2 === 1) {
      await page.mouse.move(a[0], a[1]); await page.mouse.down(); await sleep(120);
      await page.mouse.move(b[0], b[1], { steps: 12 }); await sleep(120); await page.mouse.up();
    } else { await click(a); await click(b); }
    await sleep(700);
    // ponytail: the drop alone may already auto-promote to queen (no picker shown) —
    // check before firing the extra promo click, which otherwise lands as a bogus
    // third click and gets read as an illegal follow-up move on the dropped piece.
    let changed = before === null; for (let i = 0; i < 4 && !changed; i++) { await sleep(250); changed = (await fen()) !== before; }
    if (changed) return true;
    if (promo) {
      await click(promo);
      for (let i = 0; i < 4 && !changed; i++) { await sleep(300); changed = (await fen()) !== before; }
    }
    if (changed) return true;
    log({ ev: 'move-retry', attempt, from: a, to: b, promo });
  }
  return false;
};

const setCourse = t => page.evaluate(async ({ u, id }) => fetch(`/2017-06-30/users/${u}?fields=currentCourseId`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentCourseId: id }) }), { u: uid, id: courseIdFor(t) });

await page.goto('https://www.duolingo.com/learn', { waitUntil: 'domcontentloaded' });
await sleep(4000);
await setCourse(track);
S.xp0 = S.xp = await xp(); S.username = await username(); Object.assign(S, (await stats()) || {}); saveState();
enrolledTracks = await page.evaluate(async (u) => {
  try {
    const r = await fetch(`/2017-06-30/users/${u}?fields=courses`);
    const j = await r.json();
    return (j.courses || []).map((c) => c.id);
  } catch (e) { return []; }
}, uid).then((ids) => ids.map(trackForCourseId).filter(Boolean)).catch(() => []);
await refreshProgress(true);   // seed the percentage immediately; ETA fills in once there's a measured rate

const hasChallenge = () => page.evaluate(() => !!document.querySelector('[data-test^="challenge "], [data-test="stories-element"]'));
let forceQuitOnOpen = true;   // true on cold start too — see openLesson()
// walk the tree and pick the next non-radio level by URL (0-based tree, 1-based URL),
// advancing localStorage.treeCursor each call so repeated calls rotate through levels
const pickTreeTarget = () => page.evaluate(() => {
  const units = [...document.querySelectorAll('[data-test^="skill-path-unit-"]')]; if (!units.length) return null;
  const uo = units.some(u => u.dataset.test.endsWith('-0')) ? 1 : 0;
  const cur = JSON.parse(localStorage.treeCursor || '0');
  const list = [];
  for (const u of units) for (const l of u.querySelectorAll('[data-test^="skill-path-level-"]')) {
    const m = l.dataset.test.match(/skill-path-level-(\d+) skill-path-level-(\w+)/);
    if (m && m[2] !== 'duo_radio') list.push([+u.dataset.test.replace('skill-path-unit-', '') + uo, +m[1] + 1]);
  }
  if (!list.length) return null;
  const i = cur % list.length; localStorage.treeCursor = String(cur + 1);
  return list[i];
});
const gotoTreeTarget = async (tgt) => {
  await page.goto(`https://www.duolingo.com/lesson/unit/${tgt[0]}/level/${tgt[1]}`, { waitUntil: 'domcontentloaded' });
  await sleep(6000); await inject();
  return hasChallenge();
};
// Open /lesson, falling back to clicking the START node by text on /learn.
const openLesson = async () => {
  await page.goto('https://www.duolingo.com/lesson', { waitUntil: 'domcontentloaded' });
  await sleep(5000); await inject();
  // ponytail: /lesson resumes whatever session is ALREADY open server-side,
  // regardless of the course just PATCHed — including on a cold process start,
  // not just a live /switch (that path already had its own quit sequence, this
  // one didn't). hasChallenge() here would happily return true for that stale
  // session (verified live: a fresh start on 'music' and 'chess' both kept
  // resuming an abandoned Klingon exercise from hours earlier) — openLesson()
  // has no way to tell "this challenge belongs to the wrong course", so the
  // only fix is to unconditionally dismiss once right after a course change,
  // never on every ordinary lesson-to-lesson call (that would quit real
  // lessons before they even start).
  if (forceQuitOnOpen) {
    forceQuitOnOpen = false;
    if (await hasChallenge()) {
      await page.evaluate(() => { const q = document.querySelector('[data-test="quit-button"]'); q && q.click(); }).catch(() => {});
      await sleep(1000);
      await page.evaluate(() => { const y = document.querySelector('[data-test="notification-drawer-no-thanks-button"]') || [...document.querySelectorAll('button')].find(b => /END SESSION|QUIT/i.test(b.innerText)); y && y.click(); }).catch(() => {});
      await sleep(1500);
      await page.goto('https://www.duolingo.com/lesson', { waitUntil: 'domcontentloaded' });
      await sleep(3000); await inject();
    }
  }
  if (await hasChallenge()) return true;
  const node = await page.evaluate(() => {
    const tip = [...document.querySelectorAll('*')].find(e => e.childElementCount === 0 && /^(START|JUMP HERE\?|OPEN)$/i.test(e.textContent.trim()));
    const btn = tip && (tip.closest('[data-test^="skill-path-level"]') || tip.parentElement.querySelector('button') || tip.closest('button'));
    if (!btn) return null; const r = btn.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
  });
  if (node) {
    await page.mouse.click(node[0], node[1]); await sleep(1500);
    const start = await page.evaluate(() => { const b = [...document.querySelectorAll('button, a')].find(e => /START/i.test(e.innerText.trim()) && e.getBoundingClientRect().width > 80); if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    if (start) { await page.mouse.click(start[0], start[1]); await sleep(6000); await inject(); }
  }
  if (await hasChallenge()) return true;
  // ponytail: a first-time "Welcome to X Puzzles"-style onboarding interstitial
  // (chess/music especially) matches neither the tip-node click above nor
  // hasChallenge() — but its CTA is the same CONTINUE/GOT IT/KEEP LEARNING
  // button clickByText() already knows how to find. Click through up to 3
  // stacked screens before falling to the much slower tree-walk.
  for (let i = 0; i < 3 && !(await hasChallenge()); i++) {
    if (!(await clickByText())) break;
    await sleep(1500); await inject();
  }
  if (await hasChallenge()) return true;
  // last resort: walk the tree by URL instead of the (still-stuck) served lesson
  const tgt = await pickTreeTarget();
  if (tgt && await gotoTreeTarget(tgt)) return true;
  await page.screenshot({ path: path.join(D, 'open-fail.png') }).catch(() => {});
  return false;
};

// buttons with no data-test: end-of-lesson upsells (Legendary, streak, quests)
const clickByText = () => page.evaluate(() => {
  const live = (b) => b && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
  const pn = document.querySelector('[data-test="player-next"]');
  const n = (live(pn) ? pn : null) ||
    // aria-disabled, not just .disabled — Duolingo disables buttons that way,
    // and clicking a dead one reports success to the caller. Same class of bug
    // that cost a whole overnight run.
    [...document.querySelectorAll('button')].find(b => live(b) && /^START \+\d+ XP$/i.test(b.innerText.trim())) ||
    [...document.querySelectorAll('button')].find(b => live(b) && /^(CONTINUE|NO THANKS|GOT IT|CLAIM|KEEP LEARNING)$/i.test(b.innerText.trim()));
  if (n) { n.click(); return n.innerText.trim(); }
  return null;
});

let idleOpens = 0;
let unproductiveCycles = 0;   // cycles that opened fine but gained nothing — see stallAction()
// ponytail: witnessed tonight — one "page.evaluate: Target page, context or
// browser has been closed" propagated out of the loop and killed the runner
// outright. Nothing restarts run.mjs (the LaunchAgent only covers the status
// app), so an unattended overnight run just ended. A closed page is recoverable:
// open a new one from the same context. Anything else gets logged and retried
// with a backoff, and repeated failures exit loudly rather than spinning hot.
let consecutiveCrashes = 0;
while (true) {
 try {
  if (paused) { saveState(); await sleep(500); continue; }
  if (!pendingTrack && cycleDue()) { pendingTrack = nextInRotation(track); cycle.lastAt = Date.now(); cycle.sinceCount = 0; saveCycle(); }
  if (pendingTrack && pendingTrack !== track) {
    track = pendingTrack; pendingTrack = null;
    isMath = track === 'math'; isChessTrack = track === 'chess';
    S.track = track; idleOpens = 0; forceQuitOnOpen = true;
    progressAnchor = null; S.progress = null;   // a new tree needs its own rate, not the old track's
    // the old track's prompt/choices/grid otherwise linger on screen until the
    // new track's first question loads — a switch looked like it did nothing.
    S.prompt = S.answer = S.choices = S.grid = null; saveState();
    // ponytail: /lesson just resumes whatever session is already in flight
    // server-side, regardless of the PATCHed currentCourseId — a switch mid
    // puzzle/match/lesson silently kept solving the OLD track's content under
    // the NEW track's label until that session ended on its own. Quitting
    // whatever's open first (same buttons the stuck-puzzle path already
    // clicks) makes the switch actually take effect immediately.
    if (await hasChallenge()) {
      await page.evaluate(() => { const q = document.querySelector('[data-test="quit-button"]'); q && q.click(); }).catch(() => {});
      await sleep(1000);
      await page.evaluate(() => { const y = document.querySelector('[data-test="notification-drawer-no-thanks-button"]') || [...document.querySelectorAll('button')].find(b => /END SESSION|QUIT/i.test(b.innerText)); y && y.click(); }).catch(() => {});
      await sleep(1500);
    }
    await setCourse(track);
    log({ ev: 'switch', track });
    await sleep(2000);
    S.xp0 = S.xp = await xp(); saveState();
    await refreshProgress(true);   // new track, new tree — seed its percentage right away
  }
  saveState();   // heartbeat before a potentially-hanging navigation, so a stuck run still shows a moving `at`
  await refreshProgress();   // self-throttled to every 5 min; one extra fetch per lesson cycle at most
  if (!(await openLesson())) {
    log({ ev: 'open-fail', url: page.url() });
    idleOpens++;
    // Language tree exhausted (or stuck): rotate to the least-XP course and retry.
    if (!isMath && !isChessTrack && idleOpens > 2) {
      const rotated = await page.evaluate(() => __duo.nextCourse()).catch(() => null);
      log({ ev: 'rotate', rotated }); idleOpens = 0; await sleep(2000);
      // ponytail: __duo.nextCourse() patches currentCourseId server-side but
      // only ever told run.mjs {ok, id} — the local `track` binding (what the
      // status app's UI, S.track, and every log line report) never followed,
      // so a rotate silently kept reporting the OLD track's label while
      // actually solving whatever course it picked. Same reverse-mapping
      // solver.js uses internally (strip DUOLINGO_/_EN, split on '-', lower).
      if (rotated?.ok && rotated.id) {
        let newTrack = rotated.id.replace(/^DUOLINGO_/, '').replace(/_EN$/, '').split('-')[0].toLowerCase();
        // ponytail: nextCourse() picks the LEAST-XP course, which is exactly the
        // track the stall guard just blacklisted. Seen live: pt stalls 6 cycles
        // -> switch to ja -> ja's first 3 opens fail -> rotate hands pt straight
        // back -> forever. Walk past anything already marked stalled.
        if (stalledTracks.has(newTrack)) {
          let alt = nextInRotation(newTrack);
          for (let i = 0; i < ROTATION.length && stalledTracks.has(alt); i++) alt = nextInRotation(alt);
          log({ ev: 'rotate-blocked', blocked: newTrack, track: alt });
          await setCourse(alt); await sleep(2000);
          newTrack = alt;
        }
        if (newTrack && newTrack !== track) {
          track = newTrack; isMath = track === 'math'; isChessTrack = track === 'chess';
          S.track = track; forceQuitOnOpen = true;
          progressAnchor = null; S.progress = null;
          S.prompt = S.answer = S.choices = S.grid = null; saveState();
        }
      }
    } else if (idleOpens > 6) { await sleep(60e3); idleOpens = 0; }
    continue;
  }
  idleOpens = 0;
  // ponytail: idleOpens only counts open FAILURES. A cycle that opens a lesson
  // fine and then finishes nothing (seen live: a stale session resumed for over
  // an hour, one lesson-end every 20 min, zero moves in between) was invisible.
  // Snapshot the counters and compare after the cycle.
  // XP is the one signal that works on every track: puzzles/matches only move on
  // chess, and S.lessons++ fires unconditionally at the end of the cycle. During
  // the real stall the xp field was byte-identical across every 20-min lesson-end.
  const xpBefore = S.xp, workBefore = S.puzzles + S.matches;
  const t0 = Date.now();
  let lastKey = null, repeats = 0, lastCountedKey = null;

  const quietSince = Date.now();
  let unanswerable = 0;   // consecutive challenges that can be neither answered nor skipped
  const challengeAttempts = new Map();
  let lastKind = null;    // what the detector last decided — the only clue a silent cycle leaves
  const kinds = {};       // tally per cycle: the solve paths log nothing individually
  while (Date.now() - t0 < 20 * 60e3) {                     // one lesson, 20 min ceiling
    // ponytail: the 20-minute ceiling was the ONLY escape from a cycle that
    // loops without ever logging — seen live on an English "Speak this
    // sentence" exercise, which solveLang can only skip when Duolingo offers a
    // skip button, and here it did not. Three of those at 20 minutes each is an
    // hour before the stall guard even notices. If nothing at all has been
    // logged for five minutes, this cycle is not working; end it.
    if (Date.now() - Math.max(lastLogAt, quietSince) > 5 * 60e3) { log({ ev: 'quiet-cycle', track, lastKind }); break; }
    if (paused) break;   // was only checked at the top of the outer loop — a match/puzzle session kept playing through a pause
    if (pendingTrack && pendingTrack !== track) break;   // same problem for /switch: a chess puzzle loop has no natural exit, so a switch sat ignored until the session ended on its own
    saveState();   // heartbeat: an `at` that stops advancing means the loop is stuck, not just between puzzles
    if (isMath) {
      // ponytail: __duo.widget() (math.js) reads prompt + answer choices + any
      // pattern/table grid straight off the DOM — same idea as solveLang()'s
      // ledger row, just a read instead of a full parse. Best-effort: goes all
      // null between questions, and table/choices stay null on the widget
      // types (geometry/SVG/number-line) that have nothing textual to read —
      // those still fall back to the cropped screenshot on the status app.
      page.evaluate(() => { try { return window.__duo.widget(); } catch { return null; } })
        .then(w => { const p = (w && w.prompt) || null; if (p && p !== S.prompt) speakOut(p); S.prompt = p; S.choices = (w && w.choices) || null; S.grid = (w && w.table) || null; S.answer = null; saveState(); }).catch(() => {});
      // autoLesson() is the real driver (run(15) only hits the generic
      // fallback loop and halts 'manual' on the first widget it can't
      // click). Mirror boot.js's 12-min watchdog race.
      const runAutoLesson = () => page.evaluate(async () => {
        const sleep = ms => new Promise(res => setTimeout(res, ms));
        // autoLesson() reads/writes localStorage.duoAuto for unit/level
        // bookkeeping (boot.js used to seed this before its first call).
        // run.mjs drives navigation itself, so this is just enough state
        // for autoLesson not to crash on a missing/null value.
        if (!localStorage.getItem('duoAuto')) {
          const m = location.pathname.match(/unit\/(\d+)\/level\/(\d+)/);
          localStorage.setItem('duoAuto', JSON.stringify({ running: true, unit: m ? +m[1] : 1, level: m ? +m[2] : 1, log: [], skipped: [] }));
        }
        try {
          const res = await Promise.race([
            __duo.autoLesson(),
            sleep(12 * 60e3).then(() => ({ ok: false, done: 0, err: 'watchdog' })),
          ]);
          return { ok: true, res };
        } catch (e) { return { ok: false, err: String(e) }; }
      }).catch(e => ({ ok: false, err: String(e) }));

      let r = await runAutoLesson();
      // dragSynth() (synthetic pointer events) never works on these widgets —
      // that's why run2 bails to 'needdrag' instead of trying. run.mjs has a
      // real Playwright mouse, so do the drag here and let autoLesson retry.
      let drags = 0;
      while (r.ok && r.res && String(r.res.tail || '').includes('needdrag') && drags < 3) {
        const plan = await page.evaluate(() => (window.__duo.pendingDrag ? __duo.pendingDrag() : null)).catch(() => null);
        // 'tokenslots' is a sentinel (from/to both [0,0]) for a *multi*-token
        // drag sequence autoDrag drives internally via dragXY() — a single
        // external drag can't answer it, and dragXY is itself the same
        // synthetic-event path that never works on this widget (documented
        // dead end). Nothing to click here; go straight to skip/advance.
        if (!plan || (plan.from[0] === 0 && plan.from[1] === 0 && plan.to[0] === 0 && plan.to[1] === 0)) break;
        drags++;
        await page.mouse.move(plan.from[0], plan.from[1]); await page.mouse.down(); await sleep(120);
        await page.mouse.move(plan.to[0], plan.to[1], { steps: 15 }); await sleep(120); await page.mouse.up();
        await sleep(800);
        log({ ev: 'math-drag', plan, attempt: drags });
        r = await runAutoLesson();
      }
      if (!r.ok) { log({ ev: 'math-err', err: r.err }); break; }
      log({ ev: 'math', res: r.res, drags });
      if (r.res && r.res.ok) { S.lessons++; bumpCycleCount(); saveState(); }   // only a real 'lessondone' counts
      // ponytail: this used to process.exit(0). That was survivable while the
      // solver was broken and never lost a heart; now that it answers for real
      // a bad run ends the whole unattended session, and nothing restarts
      // run.mjs (the LaunchAgent only covers the status app). Hearts refill on
      // their own, so wait for them instead of dying.
      if (r.res && r.res.err === 'no hearts') {
        log({ ev: 'no-hearts', waitMin: 20 });
        await sleep(20 * 60e3);
        break;
      }
      // Still stuck after 3 drags (or no drag plan at all, or 3 strikes on a
      // non-drag widget): skip the question, and if the level is still stuck,
      // quit so /lesson's tree-walker fallback advances treeCursor to a new level.
      if (r.res && !r.res.ok && (drags >= 3 || r.res.stuck >= 3)) {
        log({ ev: 'math-skip', next: r.res.next, drags, stuck: r.res.stuck });
        await page.evaluate(() => { const s = document.querySelector('[data-test="player-skip"]'); s && s.click(); }).catch(() => {});
        await sleep(1000);
        if (r.res.stuck >= 3) {
          await page.evaluate(() => { const q = document.querySelector('[data-test="quit-button"]'); q && q.click(); }).catch(() => {});
          await sleep(1000);
          await page.evaluate(() => { const y = document.querySelector('[data-test="notification-drawer-no-thanks-button"]') || [...document.querySelectorAll('button')].find(b => /END SESSION|QUIT/i.test(b.innerText)); y && y.click(); }).catch(() => {});
          await sleep(1500);
          // /lesson would just re-serve the same stuck level — jump by URL instead,
          // and reset duoAuto's unit/level so autoLesson's own bookkeeping matches.
          await page.goto('https://www.duolingo.com/learn', { waitUntil: 'domcontentloaded' }); await sleep(3000);
          const tgt = await pickTreeTarget();
          if (tgt) {
            await gotoTreeTarget(tgt);
            await page.evaluate((t) => {
              const st = JSON.parse(localStorage.getItem('duoAuto') || 'null') || { running: true, log: [], skipped: [] };
              st.unit = t[0]; st.level = t[1]; st.stuck = 0;
              localStorage.setItem('duoAuto', JSON.stringify(st));
            }, tgt).catch(() => {});
            log({ ev: 'math-advance', tgt });
          }
        }
      }
      break;   // one autoLesson() call is roughly one lesson; reopen and re-inject after every one
    }

    // ponytail: math's autoLesson() has an explicit 12-min watchdog race
    // because a hang was expected there. This detection block turned out to
    // have the same failure mode with none: solveLang() hanging on an
    // unrecognised widget shape (seen live on a Klingon word-bank exercise)
    // froze the whole runner with no error, no log line, just a dead screenshot
    // forever. Same fix, same pattern: race against a timeout, not just try/catch.
    const st = await Promise.race([
      page.evaluate(async () => {
        const D = window.__duo, c = D.chal();
        if (c && c.chessPuzzleInfo && !document.querySelector('[data-test^="blame"]')) return { kind: 'puzzle', plan: D.chessPlan(innerWidth) };
        // ponytail: was matchTurn(3) — bot matches lost at that level. lasker()'s
        // "better" ply already computes level 4 as a matter of course whenever it's
        // called below the level>=4 cap, so calling with 4 here (base=4, better=5
        // skipped by the existing cap) is a proven-safe strength bump: the level-4
        // search already runs today inside every level-3 call with no timing issues,
        // this just makes it the primary move instead of a tiebreak check. Level 5
        // itself stays capped — jsChessEngine.aiMove is synchronous and can block
        // the page for >10s, which risks blowing matchTurn's 15s window; doing that
        // safely needs a Worker (separate thread, real cancellable timeout), not
        // attempted here without a live match to verify it against.
        // ponytail: c.match isn't chess-specific — a music "matching" challenge
        // carries the same field, hit this branch, and crashed every single
        // lesson forever (jsChessEngine is only loaded for the chess track) —
        // that's why music never got past this line to reach solveLang() at all.
        if (window.__isChessTrack && c && c.match) { const r = await D.matchTurn(4); return { kind: 'match', r: { ...r, clicks: r.clicks && r.clicks.map(([x, y]) => [x * innerWidth / 1568, y * innerWidth / 1568]) } }; }
        if (document.querySelector('[data-test="stories-player-continue"], [data-test="stories-player-done"], [data-test="stories-element"]')) return { kind: 'story' };
        const n = document.querySelector('[data-test="player-next"]') || [...document.querySelectorAll('button')].find(b => !b.disabled && /^(CONTINUE|NO THANKS|GOT IT|START \+\d+ XP|CLAIM|KEEP LEARNING)$/i.test(b.innerText.trim()));
        // ponytail: aria-disabled, not just .disabled. Duolingo marks the CHECK
        // button aria-disabled="true" while a word bank is unanswered but leaves
        // the DOM property false, so this branch treated an unsolved challenge as
        // "press continue", clicked a dead button, and returned before the solver
        // ever ran. kind:'next' logs nothing, so it span silently — 7.5 hours,
        // 99 lessons, zero XP. The challenge branch below already checked both;
        // this one never learned.
        if (n && !n.disabled && n.getAttribute('aria-disabled') !== 'true') { n.click(); return { kind: 'next', txt: n.innerText.trim() }; }
        // ponytail: this check used to run BEFORE the one above, and the
        // lesson-complete screen satisfies it — no challenge element, quit
        // button still in the DOM. So every finished lesson was read as a
        // DuoRadio ad, quit, and the XP just earned was thrown away. Duolingo's
        // own numbers confirmed it: 12 questions answered per cycle, totalXp
        // unmoved. A screen with something to click is an end screen, not a
        // stuck one; only fall through to the radio heuristic when nothing is.
        if (!c && !document.querySelector('[data-test^="challenge "]') && document.querySelector('[data-test="quit-button"]')) return { kind: 'radio-maybe' };
        if (c && window.__canSpeak) {
          const text = D.speakText();
          if (text) return { kind: 'speak', text, tests: [...new Set([...document.querySelectorAll('[data-test]')].map(x => x.dataset.test))] };
        }
        if (c) {
          const via = await D.solveLang().catch(() => null);
          const row = via ? D.ledgerRow(via) : null;
          return { kind: 'challenge', key: JSON.stringify([c.id, c.type, c.prompt, c.correctIndices, c.correctTokens, c.displayTokens]), type: c.type, via, row, unknown: via ? null : D.logUnknown() };
        }
        return { kind: 'idle', href: location.href, txt: document.body.innerText.slice(0, 80) };
      }).catch(e => ({ kind: 'err', e: String(e) })),
      sleep(15000).then(() => ({ kind: 'err', e: 'detect-timeout' })),
    ]);
    lastKind = st.kind;
    kinds[st.kind] = (kinds[st.kind] || 0) + 1;
    if (st.kind === 'err' && st.e === 'detect-timeout') {
      log({ ev: 'detect-timeout' });
      await page.evaluate(() => { const q = document.querySelector('[data-test="quit-button"]'); q && q.click(); }).catch(() => {});
      await sleep(1000);
      await page.evaluate(() => { const y = document.querySelector('[data-test="notification-drawer-no-thanks-button"]') || [...document.querySelectorAll('button')].find(b => /END SESSION|QUIT/i.test(b.innerText)); y && y.click(); }).catch(() => {});
      await sleep(1500);
      break;
    }

    if (st.kind === 'puzzle' && st.plan) {
      const key = st.plan.moves.join(',');
      if (key === lastKey && ++repeats >= 2) {
        // player-skip doesn't exist mid chess-puzzle (Duolingo just re-serves the
        // same puzzle) — quit the lesson outright so openLesson() lands somewhere new.
        log({ ev: 'stuck', moves: st.plan.moves });
        await page.evaluate(() => { const q = document.querySelector('[data-test="quit-button"]'); q && q.click(); });
        await sleep(1000);
        await page.evaluate(() => { const y = document.querySelector('[data-test="notification-drawer-no-thanks-button"]') || [...document.querySelectorAll('button')].find(b => /END SESSION|QUIT/i.test(b.innerText)); y && y.click(); });
        repeats = 0; lastKey = null; await sleep(1500); break;
      }
      if (key !== lastKey) { lastKey = key; repeats = 0; }
      const graded = () => page.waitForFunction(() => {
        const cs = __duo.chessState(); const g = cs && cs.guess && cs.guess.gradingState;
        return (g && g.type && g.type !== 'ungraded') || /CONTINUE/i.test((document.querySelector('[data-test="player-next"]') || {}).innerText || '');
      }, null, { timeout: 4000 }).then(() => true).catch(() => false);
      let done = false; const played = new Set();
      S.puzzleStep = 0; S.puzzleTotal = st.plan.moves.length; saveState();
      for (let step = 0; step < 6 && !done; step++) {
        const pick = await page.evaluate((moves) => {
          const b = __duo.puzzleBest(); if (b) return { mv: b.move, via: 'key' };
          const fen = __duo.liveFen(); if (!fen) return { mv: moves[0], via: 'nofen' };
          let legal; try { legal = jsChessEngine.moves(fen); } catch (e) { return { mv: null, err: String(e) }; }
          return { mv: moves.find(m => (legal[m.slice(0, 2).toUpperCase()] || []).includes(m.slice(2, 4).toUpperCase())) || null, via: 'legal' };
        }, st.plan.moves.filter(m => !played.has(m)));
        if (!pick.mv) { log({ ev: 'no-move', moves: st.plan.moves, err: pick.err }); await sleep(1500); if (step > 1) break; continue; }
        const mv = pick.mv; played.add(mv);
        let ci = st.plan.moves.indexOf(mv), pts;
        if (ci >= 0) pts = st.plan.clicks[ci];
        else pts = await page.evaluate((m) => { const c = __duo.chal(); const g = __duo.chessSquares(c.fen.split(' ')[1] === 'w', innerWidth); const a = g.sq(m.slice(0, 2)), b = g.sq(m.slice(2, 4)); const o = [a, b]; if (m[4]) o.push(g.promo(b, m[4])); return o; }, mv);
        const moved = await chessMove(pts); done = await graded(); log({ ev: 'pick', mv, via: pick.via, moved, done });
        S.puzzleStep = played.size; saveState();
        if (!done) await sleep(2200);
      }
      await sleep(400);
      const graded_ = await page.evaluate(() => { const cs = __duo.chessState(); const g = cs && cs.guess && cs.guess.gradingState; return g && g.type && g.type !== 'ungraded' ? g.type : null; });
      // ponytail: an unresolved puzzle (stuck move, never graded) must not count as one —
      // it's the SAME puzzle Duolingo will re-serve, not a new one. Only count real grades,
      // and only once per distinct move-set key — a transient "correct" gradingState that
      // reverts (the click-retry bug) must not re-count the same stuck puzzle every retry.
      if ((graded_ || done) && key !== lastCountedKey) {
        lastCountedKey = key;
        const ok = !/incorrect|wrong/i.test(graded_ || '');
        S.puzzles++; if (!ok) S.misses++; S.last = 'puzzle'; log({ ev: 'puzzle', moves: st.plan.moves, ok }); bumpCycleCount(); saveState();
        puzzleLedger({ at: new Date().toISOString(), moves: st.plan.moves, ok });
        S.xp = await xp(); S.puzzleStep = null; S.puzzleTotal = null; saveState(); // ponytail: puzzles never funneled through the lesson-complete xp refresh — was silently stale
        // self-calibration: a promotion move that graded wrong means the guessed picker
        // slot ('qrbn' order) is off for this piece — cycle to the next slot (0-3) and
        // persist it, so the next puzzle needing that piece (and a retry of this one,
        // since it gets re-served until it's answered correctly) uses the learned slot.
        const promoPiece = st.plan.moves.find(m => m[4] && m.length === 5)?.[4];
        if (promoPiece) {
          if (ok) { promoCalib[promoPiece] = 'qrbn'.indexOf(promoPiece); saveCalib(); }
          else { promoCalib[promoPiece] = ((promoCalib[promoPiece] ?? 'qrbn'.indexOf(promoPiece)) + 1) % 4; saveCalib();
            await page.evaluate(c => { window.__duo.promoCalib = c; }, promoCalib); }
        }
        await page.evaluate(() => __duo.chessNext()).catch(() => {});
      } else {
        log({ ev: 'puzzle-unresolved', moves: st.plan.moves });
      }
    } else if (st.kind === 'match') {
      const r = st.r;
      if (r.over) { S.matches++; log({ ev: 'match-over', status: r.status, ply: r.hist && r.hist.length }); bumpCycleCount(); S.xp = await xp(); saveState();
        await page.evaluate(() => { const n = document.querySelector('[data-test="player-next"]'); n && n.click(); }); await sleep(2000); }
      else if (r.clicks) { await chessMove(r.clicks); log({ ev: 'move', move: r.move, ply: r.ply }); speakOut(r.move); }
      else if (r.err) { log({ ev: 'match-err', err: r.err }); await sleep(3000); }
      else await sleep(1500);
    } else if (st.kind === 'story') {
      let idle = 0, tStory = Date.now();
      while (Date.now() - tStory < 10 * 60e3) {
        const s = await page.evaluate(() => __duo.storyStep()).catch(e => 'ERR:' + e);
        if (!s) { if (++idle > 120) { await page.evaluate(() => { const q = document.querySelector('[data-test="close-button-stories"], [data-test="quit-button"]'); q && q.click(); }); await sleep(1000); await clickByText();
          // ponytail: same "log the shape, don't guess it" rule solveLang()'s
          // player-skip path already follows — an abort used to record nothing,
          // so 1033 of them said nothing about WHICH story shape storyStep()
          // can't answer.
          const dump = await page.evaluate(() => { const e = __duo.storyEl() || {}; return { type: e.type, keys: Object.keys(e).slice(0, 40) }; }).catch(() => null);
          log({ ev: 'story-abort', dump });
          // ponytail: the close buttons above do NOT end the story session
          // server-side, so the next /lesson resumed the SAME unsolvable story
          // — 1033 identical 80-second abort cycles on 'pt' before this line.
          // forceQuitOnOpen makes openLesson() dismiss it and fall through to
          // the tree-walker, which picks a different node.
          forceQuitOnOpen = true;
          break; } await sleep(500); continue; }
        idle = 0;
        const stillStory = await page.evaluate(() => !!document.querySelector('[data-test="stories-player-continue"], [data-test="stories-player-done"], [data-test="stories-element"]'));
        if (!stillStory) break;
      }
      for (let i = 0; i < 8; i++) { const t = await clickByText(); if (!t) break; await sleep(1200); }
      log({ ev: 'story-end' }); break;   // story node ends the "lesson"
    } else if (st.kind === 'radio-maybe') {
      if (Date.now() - t0 > 20e3) {
        await page.evaluate(() => { document.querySelector('[data-test="quit-button"]').click(); });
        await sleep(1200);
        await page.evaluate(() => { const y = document.querySelector('[data-test="notification-drawer-no-thanks-button"]') || [...document.querySelectorAll('button')].find(b => /END SESSION|QUIT/i.test(b.innerText)); y && y.click(); });
        log({ ev: 'radio-skip' }); await sleep(2000); break;
      }
      await sleep(1000);
    } else if (st.kind === 'speak') {
      // ponytail: the record-button selector below is a best guess (Duolingo
      // ships no public data-test docs and this hasn't been verified against
      // a live "speak this sentence" screen yet). If it's wrong, nothing
      // breaks — the click no-ops, unanswerable climbs, and st.tests above is
      // already logged so the real data-test can be read off log.jsonl and
      // swapped in, same as every other "logUnknown() then fix" case here.
      await synthSpeech(st.text).catch(e => log({ ev: 'speak-tts-err', e: String(e) }));
      const clicked = await page.evaluate(() => {
        const b = document.querySelector('[data-test="speak-button"], [data-test*="record"], [data-test*="microphone"]');
        if (b) { b.click(); return true; }
        return false;
      });
      log({ ev: 'speak', text: st.text, clicked, tests: st.tests });
      await sleep(2600);   // let the fake mic "finish talking" before Duolingo grades it
      if (clicked) {
        await page.evaluate(() => {
          const b = document.querySelector('[data-test="speak-button"], [data-test*="record"], [data-test*="microphone"]');
          b && b.click();   // stop, if it's a start/stop toggle rather than auto-stop
        }).catch(() => {});
        unanswerable = 0;
      } else if (++unanswerable >= 5) {
        log({ ev: 'unanswerable', type: 'speak' });
        await page.evaluate(() => { const q = document.querySelector('[data-test="quit-button"]'); q && q.click(); }).catch(() => {});
        await sleep(1000);
        await page.evaluate(() => { const y = document.querySelector('[data-test="notification-drawer-no-thanks-button"]') || [...document.querySelectorAll('button')].find(b => /END SESSION|QUIT/i.test(b.innerText)); y && y.click(); }).catch(() => {});
        await sleep(1500);
        break;
      }
      await sleep(1400);
    } else if (st.kind === 'challenge') {
      // A skip/continue click is not progress. The same challenge can return
      // indefinitely, with feedback screens in between every failed attempt.
      if (repeatedChallenge(challengeAttempts, st.key)) {
        log({ ev: 'repeated-challenge', type: st.type });
        forceQuitOnOpen = true;
        break;
      }
      if (st.row) { ledger([st.row]); S.prompt = st.row.prompt || null; S.answer = st.row.answer || null; S.choices = st.row.choices || null; S.grid = null; saveState(); speakOut([st.row.prompt, st.row.answer].filter(Boolean).join('. ')); }
      if (!st.via) log({ ev: 'unknown-challenge', type: st.type, u: st.unknown });
      const ok = await page.evaluate(async () => { const n = document.querySelector('[data-test="player-next"]'); if (n && !n.disabled && n.getAttribute('aria-disabled') !== 'true') { n.click(); return true; } return false; });
      if (!ok) {
        const skipped = await page.evaluate(() => { const s = document.querySelector('[data-test="player-skip"]'); if (s) { s.click(); return true; } return false; });
        // ponytail: neither answerable nor skippable. Seen live on English's
        // "Speak this sentence" — a microphone exercise solveLang can only skip
        // when Duolingo offers a skip button, and on that screen it does not.
        // The old code slept a second and looped, forever, logging nothing.
        // Quit the lesson instead: another one will serve different content.
        if (!skipped && ++unanswerable >= 5) {
          log({ ev: 'unanswerable', type: st.type });
          await page.evaluate(() => { const q = document.querySelector('[data-test="quit-button"]'); q && q.click(); }).catch(() => {});
          await sleep(1000);
          await page.evaluate(() => { const y = document.querySelector('[data-test="notification-drawer-no-thanks-button"]') || [...document.querySelectorAll('button')].find(b => /END SESSION|QUIT/i.test(b.innerText)); y && y.click(); }).catch(() => {});
          await sleep(1500);
          break;
        }
        if (!skipped) await sleep(1000);
      } else unanswerable = 0;
      await sleep(1400);
    } else if (st.kind === 'next') {
      await sleep(1200);
      const stillLesson = await page.evaluate(() => location.pathname.startsWith('/lesson'));
      if (!stillLesson) break;
    } else if (st.kind === 'err') { log({ ev: 'err', e: st.e }); break; }
    else { await sleep(1500); const stillLesson = await page.evaluate(() => location.pathname.startsWith('/lesson')).catch(() => false); if (!stillLesson) break; }
  }

  S.xp = await xp(); Object.assign(S, (await stats()) || {}); S.last = track;
  const gainedXp = S.xp != null && xpBefore != null && S.xp > xpBefore;
  if (gainedXp) { S.lessons++; bumpCycleCount(); }
  saveState();
  log({ ev: 'lesson-end', xp: S.xp, gainedXp, kinds });
  if (gainedXp || S.puzzles + S.matches > workBefore) unproductiveCycles = 0;
  else unproductiveCycles++;
  const action = stallAction(unproductiveCycles);
  if (action === 'reset') {
    log({ ev: 'stalled', cycles: unproductiveCycles, action });
    forceQuitOnOpen = true;   // dump whatever session keeps getting resumed
    await page.goto('https://www.duolingo.com/learn', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(2000);
  } else if (action === 'switch') {
    log({ ev: 'stalled', cycles: unproductiveCycles, action, track });
    markStalled(track);   // stop balance handing it straight back, this run or the next
    trackPct.delete(track); trackRemaining.delete(track);
    unproductiveCycles = 0;
    pendingTrack = nextInRotation(track);   // this track is going nowhere; try another
  }
  consecutiveCrashes = 0;   // a cycle finished end to end; the loop is healthy
 } catch (e) {
  const msg = String(e && e.message || e);
  consecutiveCrashes++;
  log({ ev: 'loop-error', err: msg.slice(0, 300), consecutive: consecutiveCrashes });
  // A closed page is the recoverable one: the context is still alive, so open
  // a fresh page and carry on rather than ending an overnight run.
  if (page.isClosed?.() || /Target page, context or browser has been closed|Target closed/i.test(msg)) {
    try {
      page = await ctx.newPage();
      forceQuitOnOpen = true;   // the new page has no idea what session was open
      log({ ev: 'page-recovered' });
    } catch (e2) {
      console.error('Browser is gone and a new page could not be opened:', e2);
      process.exit(1);   // the context itself died — nothing left to recover
    }
  }
  if (consecutiveCrashes >= 5) {
    console.error(`Giving up after ${consecutiveCrashes} consecutive loop errors. Last: ${msg}`);
    process.exit(1);   // exit loudly instead of spinning hot on a permanent fault
  }
  await sleep(Math.min(30_000, 2000 * consecutiveCrashes));   // back off, don't hammer
 }
}

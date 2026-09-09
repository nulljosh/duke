// Overnight chess. Playwright drives its own Chromium with trusted mouse
// clicks (the Rive board ignores synthetic events), so no Claude, no
// extension, no operator. Reuses duo.js for the puzzle key + geometry.
//   node chessRunner.mjs            (needs scripts/jwt.txt: the jwt_token cookie)
// Logs: chess-log.jsonl (one line per puzzle/move), chess-state.json (summary).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname);
const jwt = fs.readFileSync(path.join(D, 'jwt.txt'), 'utf8').trim();
const uid = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString()).sub;
const log = o => fs.appendFileSync(path.join(D, 'chess-log.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n');
const S = { started: new Date().toISOString(), puzzles: 0, misses: 0, matches: 0, wins: 0, losses: 0, screens: 0, xp0: null, xp: null, last: null };
const save = () => fs.writeFileSync(path.join(D, 'chess-state.json'), JSON.stringify({ at: new Date().toISOString(), ...S }, null, 1));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(path.join(D, '.pw-profile'), { headless: false, viewport: { width: 1400, height: 900 }, args: ['--disable-background-timer-throttling'] });
await ctx.addCookies([{ name: 'jwt_token', value: jwt, domain: '.duolingo.com', path: '/', secure: true, sameSite: 'Lax' }]);
const page = ctx.pages()[0] || await ctx.newPage();
const inject = async () => { for (const f of ['duo.js', 'js-chess-engine.js']) await page.addScriptTag({ content: fs.readFileSync(path.join(D, f), 'utf8') }); };
const xp = async () => page.evaluate(async u => (await (await fetch(`/2017-06-30/users/${u}?fields=totalXp`)).json()).totalXp, uid).catch(() => null);
const click = async ([x, y]) => { await page.mouse.click(x, y); await sleep(550); };   // 0.5s: the board swallows a faster second click

await page.goto('https://www.duolingo.com/learn', { waitUntil: 'domcontentloaded' });
await sleep(4000);
await page.evaluate(async u => fetch(`/2017-06-30/users/${u}?fields=currentCourseId`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentCourseId: 'CHESS_CH' }) }), uid);
S.xp0 = S.xp = await xp(); save();

const openLesson = async () => {
  await page.goto('https://www.duolingo.com/lesson', { waitUntil: 'domcontentloaded' });
  await sleep(5000); await inject();
  const has = () => page.evaluate(() => !!document.querySelector('[data-test^="challenge "], [data-test="stories-element"]'));
  if (await has()) return true;
  // bounced to /learn: click the active node, then its START popup (both by text, no data-test)
  const node = await page.evaluate(() => {
    const tip = [...document.querySelectorAll('*')].find(e => e.childElementCount === 0 && /^(START|JUMP HERE\?|OPEN)$/i.test(e.textContent.trim()));
    const btn = tip && (tip.closest('[data-test^="skill-path-level"]') || tip.parentElement.querySelector('button') || tip.closest('button'));
    if (!btn) return null; const r = btn.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
  });
  if (node) { await page.mouse.click(node[0], node[1]); await sleep(1500);
    const start = await page.evaluate(() => { const b = [...document.querySelectorAll('button, a')].find(e => /START/i.test(e.innerText.trim()) && e.getBoundingClientRect().width > 80); if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    if (start) { await page.mouse.click(start[0], start[1]); await sleep(6000); await inject(); }
  }
  if (await has()) return true;
  await page.screenshot({ path: path.join(D, 'chess-fail.png') }).catch(() => {});
  return false;
};

let idle = 0, lastKey = null, repeats = 0;
while (true) {
  if (!(await openLesson())) { S.screens++; log({ ev: 'open-fail', url: page.url() }); if (++idle > 6) { await sleep(60e3); idle = 0; } continue; }
  idle = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 20 * 60e3) {                     // one lesson
    const st = await page.evaluate(async () => {
      const D = window.__duo, c = D.chal();
      if (c && c.chessPuzzleInfo && !document.querySelector('[data-test^="blame"]')) return { kind: 'puzzle', plan: D.chessPlan(innerWidth) };
      if (c && c.match) { const r = await D.matchTurn(3); if (r.clicks) { r.clicks = r.clicks; } return { kind: 'match', r: { ...r, clicks: r.clicks && r.clicks.map(([x, y]) => [x * innerWidth / 1568, y * innerWidth / 1568]) } }; }
      const n = document.querySelector('[data-test="player-next"]') || [...document.querySelectorAll('button')].find(b => !b.disabled && /^(CONTINUE|NO THANKS|GOT IT)$/i.test(b.innerText.trim()));
      if (n && !n.disabled) { n.click(); return { kind: 'next', txt: n.innerText.trim() }; }
      if (c) { const via = await D.solveLang().catch(() => null); return { kind: 'other', type: c.type, via, next: D.read().next }; }
      return { kind: 'idle', href: location.href, txt: document.body.innerText.slice(0, 80) };
    }).catch(e => ({ kind: 'err', e: String(e) }));
    if (st.kind === 'puzzle' && st.plan) {
      // correctMoves alternates ours / the opponent's reply; only click ours, wait out the reply
      const key = st.plan.moves.join(',');
      if (key === lastKey && ++repeats >= 2) { log({ ev: 'stuck', moves: st.plan.moves, clicks: st.plan.clicks, canvas: await page.evaluate(() => { const c = __duo.chessBoard(); const r = c && c.getBoundingClientRect(); return r && [r.left, r.top, r.width, r.height, c.width, c.height, innerWidth]; }) }); await page.screenshot({ path: path.join(D, 'chess-stuck.png') }).catch(() => {}); await page.evaluate(() => { const s = document.querySelector('[data-test="player-skip"]'); s && s.click(); }); repeats = 0; lastKey = null; await sleep(1500); continue; }
      if (key !== lastKey) { lastKey = key; repeats = 0; }
      else {   // same puzzle again: a stray move is on the board, undo it (arrow button left of the board, bottom)
        const undo = await page.evaluate(() => { const c = __duo.chessBoard(); if (!c) return null; const cr = c.getBoundingClientRect();
          const b = [...document.querySelectorAll('button')].map(b => [b, b.getBoundingClientRect()]).filter(([, r]) => r.width > 20 && r.right < cr.left && r.top > cr.top + cr.height * 0.6).sort((x, y) => x[1].left - y[1].left)[0];
          if (!b) return null; return [b[1].left + b[1].width / 2, b[1].top + b[1].height / 2]; });
        if (undo) { await click(undo); await click(undo); log({ ev: 'undo', moves: st.plan.moves }); await sleep(800); }
      }
      for (let i = 0; i < st.plan.clicks.length; i += 2) { for (const pt of st.plan.clicks[i]) await click(pt); if (i + 2 < st.plan.clicks.length) await sleep(1500); }
      // wait for the grader before reading the result, else the same plan replays on a stale board
      await page.waitForFunction(() => document.querySelector('[data-test^="blame"]') || /CONTINUE/i.test((document.querySelector('[data-test="player-next"]') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
      await sleep(400);
      const ok = await page.evaluate(() => !document.querySelector('[data-test="blame-incorrect"]'));
      S.puzzles++; if (!ok) S.misses++; S.last = 'puzzle'; log({ ev: 'puzzle', moves: st.plan.moves, ok });
      await page.evaluate(() => __duo.chessNext()).catch(() => {});
    } else if (st.kind === 'match') {
      const r = st.r;
      if (r.over) { S.matches++; if (/win|won/i.test(r.status)) S.wins++; else S.losses++; log({ ev: 'match-over', status: r.status, ply: r.hist && r.hist.length }); await page.evaluate(() => { const n = document.querySelector('[data-test="player-next"]'); n && n.click(); }); await sleep(2000); }
      else if (r.clicks) { for (const pt of r.clicks) await click(pt); log({ ev: 'move', move: r.move, ply: r.ply }); }
      else if (r.err) { log({ ev: 'match-err', err: r.err }); await sleep(3000); }
      else await sleep(1500);
    } else if (st.kind === 'other') {
      log({ ev: 'other', type: st.type, via: st.via });
      await page.evaluate(async () => { const D = window.__duo; await D.go(); const r = D.read(); if (r.next) await D.go(); }).catch(() => {});
      if (!st.via) await page.evaluate(() => { const s = document.querySelector('[data-test="player-skip"]'); s && s.click(); });
      await sleep(1000);
    } else if (st.kind === 'next') { await sleep(1200); if (!page.url().includes('/lesson')) break; }
    else if (st.kind === 'err') { log({ ev: 'err', e: st.e }); break; }
    else { await sleep(1500); if (!page.url().includes('/lesson')) break; }
    if (Date.now() - t0 > 60e3 && (Date.now() - t0) % 60e3 < 1600) { S.xp = await xp(); save(); }
  }
  S.xp = await xp(); save(); log({ ev: 'lesson-end', xp: S.xp });
}

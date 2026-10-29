
// ---- 2026-09-08: chess MATCH (bot game) ----
// chal().match carries boardFen / playerColor / moveHistory / status. Load
// js-chess-engine.js (served next to this file) and ask it for a move; clicks go
// through the same geometry as puzzles. matchStep() is one call per turn.
(function () {
  const D = window.__duo;
  D.chessSquares = function (white, shotW = 1568) {
    const cv = this.chessBoard(); if (!cv) return null;
    const r = cv.getBoundingClientRect(), k = shotW / innerWidth;
    const bx = r.left + r.width * 0.0975, by = r.top + r.height * 0.1, s = r.width * 0.8 / 8;
    const sq = q => { let f = q.charCodeAt(0) - 97, rk = +q[1] - 1; if (!white) { f = 7 - f; rk = 7 - rk; }
      return [Math.round((bx + s * (f + 0.5)) * k), Math.round((by + s * (7 - rk + 0.5)) * k)]; };
    const promo = b => { const left = Math.max(bx, Math.min(b[0] / k - 2.25 * s, bx + 8 * s - 4.5 * s)); return [Math.round((left + 0.8 * s) * k), Math.round(b[1] + 2.2 * s * k)]; };
    return { sq, promo };
  };
  D.matchStep = function (level = 2) {
    const c = this.chal(); if (!c || !c.match) return { noMatch: true, type: c && c.type };
    const m = c.match, white = m.playerColor === 'white';
    // match.boardFen is a snapshot from load time; the live move list is on the
    // challengeState prop two fibers up from the challenge element. Replay it.
    const cs = this.chessState(), hist = (cs && cs.guess && cs.guess.moveHistory) || m.moveHistory || [];
    // the live FEN is a useRef 6 fibers above the canvas (bot moves never reach
    // challengeState.moveHistory until later); fall back to replaying history.
    let fen = this.liveFen();
    if (!fen) { fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      for (const mv of hist) { try { fen = jsChessEngine.getFen(jsChessEngine.move(fen, mv.slice(0, 2).toUpperCase(), mv.slice(2, 4).toUpperCase())); } catch (e) { return { err: 'replay:' + mv + ':' + e, hist }; } } }
    const st = cs && cs.guess && cs.guess.matchState && cs.guess.matchState.status;
    if (st && st !== 'playing') return { over: true, status: st, hist, next: (document.querySelector('[data-test="player-next"]') || {}).innerText };
    if ((fen.split(' ')[1] === 'w') !== white) return { wait: true, fen, last: m.moveHistory.slice(-1)[0] };
    // Lasker: "when you see a good move, look for a better one." Take the quick
    // move, then ask one ply deeper; if the deeper search disagrees, it wins.
    const mv = this.lasker(fen, level), from = Object.keys(mv)[0], to = mv[from];
    const g = this.chessSquares(white), a = g.sq(from.toLowerCase()), b = g.sq(to.toLowerCase());
    const clicks = [a, b];
    // promotion: engine returns the plain square; pawn reaching last rank = pick queen
    if (/[18]/.test(to[1]) && this.pawnAt(fen, from.toLowerCase())) clicks.push(g.promo(b));
    return { move: from + to, clicks, fen, ply: hist.length };
  };
  D.lasker = function (fen, level = 2) {
    const good = jsChessEngine.aiMove(fen, level);
    // ponytail: one extra ply, capped at 4 (level 5 can take >10s in-page)
    const better = level >= 4 ? good : jsChessEngine.aiMove(fen, level + 1);
    const key = m => Object.entries(m)[0].join('');
    return key(better) !== key(good) ? better : good;
  };
  D.liveFen = function () {
    const cv = this.chessBoard(); if (!cv) return null;
    let f = cv[Object.keys(cv).find(k => k.startsWith('__reactFiber$'))], d = 0;
    const isFen = s => typeof s === 'string' && /^[rnbqkpRNBQKP1-8\/]+ [wb] /.test(s);
    while (f && d++ < 12) { let h = f.memoizedState; while (h) { const m = h.memoizedState; if (m && typeof m === 'object' && isFen(m.current)) return m.current; h = h.next; } f = f.return; }
    return null;
  };
  // One call per turn: wait until it is our move (bot thinking/animating), then plan.
  D.matchTurn = async function (level = 2, maxMs = 15000) {
    const t0 = Date.now(); let r;
    do { r = this.matchStep(level); if (!r.wait) return r; await this.sleep(400); } while (Date.now() - t0 < maxMs);
    return r;
  };
  D.chessState = function () {
    const el = document.querySelector('[data-test^="challenge "]'); if (!el) return null;
    let f = el[Object.keys(el).find(k => k.startsWith('__reactFiber$'))], d = 0;
    while (f && d++ < 14) { if (f.memoizedProps && f.memoizedProps.challengeState) return f.memoizedProps.challengeState; f = f.return; }
    return null;
  };
  D.pawnAt = function (fen, sq) {
    const rows = fen.split(' ')[0].split('/'), row = rows[8 - +sq[1]]; let f = 0;
    for (const ch of row) { if (/\d/.test(ch)) f += +ch; else { if (f === sq.charCodeAt(0) - 97) return /p/i.test(ch); f++; } }
    return false;
  };
})();
;'__duo ready';

// ---- 2026-09-08: Stories ----
// Story nodes are a separate player. Each challenge element carries
// storyElement.{type, correctAnswerIndex, ...} on the fiber of its choice
// buttons; continue is [data-test="stories-player-continue"].
(function () {
  const D = window.__duo;
  const fiberUp = (el, pick) => { const k = Object.keys(el).find(k => k.startsWith('__reactFiber')); let f = el && el[k]; for (let i = 0; i < 40 && f; i++, f = f.return) { const r = pick(f.memoizedProps || {}); if (r) return r; } return null; };
  D.storyEl = function () {
    const c = document.querySelector('[data-test="stories-choice"], [data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])');
    return c ? fiberUp(c, p => p.storyElement || p.currentChallenge) : null;
  };
  D.storyDump = function () {
    const e = this.storyEl() || {};
    return { type: e.type, keys: Object.keys(e), tests: [...new Set([...document.querySelectorAll('[data-test]')].map(x => x.dataset.test))].filter(t => !/quit|progress|audio|backdrop/.test(t)) };
  };
  // One step: answer if a key is visible, else CONTINUE. Returns what it did.
  D.storyStep = async function () {
    const cont = document.querySelector('[data-test="stories-player-continue"], [data-test="stories-player-done"]');
    // POINT_TO_PHRASE: the boxed words inside the sentence are tap-token buttons
    const choices = [...document.querySelectorAll('[data-test="stories-choice"]')].length
      ? [...document.querySelectorAll('[data-test="stories-choice"]')]
      : [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
    // ponytail: CONTINUE is disabled until answered, so an enabled one means "move on"
    if (cont && !cont.disabled && cont.getAttribute('aria-disabled') !== 'true') { cont.click(); await this.sleep(700); return 'cont'; }
    const e = choices.length ? this.storyEl() : null;
    if (e && typeof e.correctAnswerIndex === 'number' && choices[e.correctAnswerIndex]) {
      const el = choices[e.correctAnswerIndex]; if (el.getAttribute('aria-disabled') !== 'true') { el.click(); await this.sleep(700); return 'story:' + e.type; }
    }
    if (e && e.type === 'ARRANGE' && Array.isArray(e.phraseOrder)) {   // tap tiles in phraseOrder
      const txt = b => ((b.querySelector('[data-test="challenge-tap-token-text"]') || b).innerText || '').trim().toLowerCase();
      for (const i of e.phraseOrder) {
        const w = String(e.selectablePhrases[i] || '').toLowerCase();
        const b = choices.find(b => txt(b) === w && b.getAttribute('aria-disabled') !== 'true' && !b.disabled);
        if (!b) return null;
        b.click(); await this.sleep(350);
      }
      return 'story:ARRANGE';
    }
    if (e && e.type === 'MATCH' && Array.isArray(e.matches)) {     // pairs: click phrase then translation
      const txt = b => ((b.querySelector('[data-test="challenge-tap-token-text"]') || b).innerText || '').trim().toLowerCase();
      const live = () => choices.filter(b => b.getAttribute('aria-disabled') !== 'true' && !b.disabled);
      let did = 0;
      for (const m of e.matches) {
        const want = Object.values(m).filter(v => typeof v === 'string').map(v => v.toLowerCase());
        const hit = live().filter(b => want.includes(txt(b))).slice(0, 2);
        if (hit.length < 2) continue;
        for (const b of hit) { b.click(); await this.sleep(350); } did++;
      }
      return did ? 'story:MATCH' : null;
    }
    if (e && Array.isArray(e.correctAnswerIndices)) {   // ponytail: shape guess, dumped if wrong
      for (const i of e.correctAnswerIndices) { if (choices[i]) { choices[i].click(); await this.sleep(400); } }
      return 'story:' + e.type;
    }
    if (cont && !cont.disabled && cont.getAttribute('aria-disabled') !== 'true') { cont.click(); await this.sleep(700); return 'cont'; }
    return null;
  };
})();
;'__duo ready';

// ---- 2026-09-08: course switch ----
// __duo.course('es') / ('math') / ('chess') / ('music'): PATCH the server-side
// current course, then remount /learn. Language ids are DUOLINGO_<LANG>_EN
// (uppercase; 'zh' -> ZH-CN, 'nl' -> NL-NL). Chess has no in-page loop (Rive
// board needs real clicks); math uses boot.js, languages use langBoot.js.
(function () {
  const D = window.__duo;
  D.courseId = k => ({ math: 'MATH_BT', chess: 'CHESS_CH', music: 'MUSIC_MU', zh: 'DUOLINGO_ZH-CN_EN', nl: 'DUOLINGO_NL-NL_EN' })[k] || ('DUOLINGO_' + k.toUpperCase() + '_EN');
  D.course = async function (k) {
    const uid = JSON.parse(atob(document.cookie.split('; ').find(c => c.startsWith('jwt_token=')).split('=')[1].split('.')[1])).sub;
    const r = await fetch(`/2017-06-30/users/${uid}?fields=currentCourseId`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentCourseId: this.courseId(k) }) });
    if (r.status !== 200) return { ok: false, status: r.status, id: this.courseId(k) };   // 400 = not enrolled: visit /enroll/<lang>/en first
    localStorage.duoCourse = k; localStorage.removeItem('langCursor');
    history.pushState({}, '', '/learn'); dispatchEvent(new PopStateEvent('popstate'));
    // the SPA may keep the old tree; wait for the title to flip, else hard reload (loop dies, re-inject)
    const t0 = document.title; for (let i = 0; i < 20 && document.title === t0; i++) await this.sleep(1000);
    if (document.title === t0 && !/math|chess|music/.test(k)) { localStorage.duoReload = '1'; location.reload(); }
    return { ok: true, id: this.courseId(k) };
  };
  // least-XP enrolled language other than the current one → course(); 'least completed first'
  D.nextCourse = async function () {
    const uid = JSON.parse(atob(document.cookie.split('; ').find(c => c.startsWith('jwt_token=')).split('=')[1].split('.')[1])).sub;
    const u = await (await fetch(`/2017-06-30/users/${uid}?fields=courses,currentCourseId`)).json();
    const langs = u.courses.filter(c => /^DUOLINGO_/.test(c.id) && c.id !== u.currentCourseId).sort((a, b) => a.xp - b.xp);
    if (!langs.length) return null;
    const code = langs[0].id.replace(/^DUOLINGO_/, '').replace(/_EN$/, '').split('-')[0].toLowerCase();
    return this.course(code);
  };
})();
;'__duo ready';

// ---- 2026-09-09: puzzle key by position ----
// chessPuzzleInfo.moveEvaluationsForPositions: { "<board> <side>": [{move, moveCorrectness, enemyResponse}] }.
// Look the live FEN up and play the 'correct' entry; correctMoves alone mixes steps and alternatives.
(function () {
  const D = window.__duo;
  D.puzzleBest = function () {
    const c = this.chal(); if (!c || !c.chessPuzzleInfo) return null;
    const fen = this.liveFen() || c.fen; if (!fen) return null;
    const key = fen.split(' ').slice(0, 2).join(' ');
    const ev = c.chessPuzzleInfo.moveEvaluationsForPositions || {};
    const list = ev[key] || ev[Object.keys(ev).find(k => k.split(' ')[0] === key.split(' ')[0])] || [];
    const best = list.find(e => e.moveCorrectness === 'correct') || list.find(e => e.moveCorrectness === 'suboptimal');
    return best ? { move: best.move, fen, known: true } : null;
  };
})();
;'__duo ready';

// run.mjs now has a real mouse (Playwright) and can perform the drag that
// dragSynth() (synthetic pointer events) never could on these widgets. When
// run2/autoLesson bails with 'needdrag', expose the plan's two points in
// page CSS px (plan() already resolves iframe-local rects to page space via
// fr.left/fr.top, so no extra offset needed here) for the runner to drag.
window.__duo.pendingDrag = function () {
  try {
    const p = this.plan();
    if (p && Array.isArray(p.from) && Array.isArray(p.to)) return { from: p.from, to: p.to, kind: p.kind || null };
  } catch (e) {}
  return null;
};

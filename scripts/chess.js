// Solver for lichess.org/training puzzles, same shape as duo.js: read live page
// state, work out the move, click. Injected into an already-signed-in (or even
// anonymous) lichess tab.
//
// Key fact this whole thing leans on: lichess ships the puzzle SOLUTION to the
// client up front (it has to — the client checks your moves against it locally,
// only reporting completion to the server). So there is no engine to write: find
// that JSON, replay the UCI move list against the board.
//
// ponytail: the exact script-tag id lichess uses to embed that JSON has moved
// before (page-init-data / a bare <script type="application/json"> next to
// #training). findSolution() below scans every script tag for a `solution`
// array instead of hardcoding one id, so a markup tweak doesn't break this.
// Untested against a live tab — first run may need a selector fix in
// findSolution() or squareCenter()'s DOM assumptions about cg-board/chessground.
(function () {
  function findSolution() {
    for (const s of document.querySelectorAll('script')) {
      const t = s.textContent;
      if (!t || !t.includes('"solution"')) continue;
      try {
        const m = t.match(/\{[\s\S]*\}/);
        const data = JSON.parse(m[0]);
        const p = data.puzzle || (data.game && data) || data;
        if (p && p.puzzle && Array.isArray(p.puzzle.solution)) return { fen: p.puzzle.fen || (p.game && p.game.fen), sol: p.puzzle.solution };
        if (p && Array.isArray(p.solution)) return { fen: p.fen, sol: p.solution };
      } catch (e) { /* not the right script tag */ }
    }
    return null;
  }

  function board() { return document.querySelector('cg-board'); }
  function orientationWhite() {
    const wrap = document.querySelector('.cg-wrap');
    return !wrap || wrap.classList.contains('orientation-white');
  }

  function squareCenter(square, rect, white) {
    const file = square.charCodeAt(0) - 97; // a=0..h=7
    const rank = +square[1] - 1;            // 1=0..8=7
    const col = white ? file : 7 - file;
    const row = white ? 7 - rank : rank;
    const size = rect.width / 8;
    return { x: rect.left + size * (col + 0.5), y: rect.top + size * (row + 0.5) };
  }

  function fire(type, x, y, target) {
    (target || document).dispatchEvent(new MouseEvent(type, {
      bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0,
    }));
  }

  async function playMove(uci) {
    const b = board();
    if (!b) return false;
    const rect = b.getBoundingClientRect();
    const white = orientationWhite();
    const from = squareCenter(uci.slice(0, 2), rect, white);
    const to = squareCenter(uci.slice(2, 4), rect, white);
    fire('mousedown', from.x, from.y, b);
    await new Promise(r => setTimeout(r, 80));
    fire('mousemove', to.x, to.y);
    await new Promise(r => setTimeout(r, 80));
    fire('mouseup', to.x, to.y);
    // promotion: uci[4] is the piece letter (q/r/b/n) when a pawn hits the last rank
    if (uci.length > 4) {
      await new Promise(r => setTimeout(r, 200));
      const role = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' }[uci[4]];
      const choice = document.querySelector(`square.promotion-choice piece.${role}`);
      if (choice) choice.click();
    }
    return true;
  }

  // The board only shows OUR side to move; the opponent's reply in the solution
  // list plays itself out via the site's own animation. So we only click every
  // other entry, waiting between our moves for that reply to land.
  window.__chessSolve = async function () {
    const found = findSolution();
    if (!found) return { ok: false, err: 'no solution JSON found on page' };
    for (let i = 0; i < found.sol.length; i += 2) {
      await playMove(found.sol[i]);
      await new Promise(r => setTimeout(r, 900)); // let the opponent reply animate
    }
    return { ok: true, moves: found.sol.length };
  };
})();

// Unattended loop for scripts/chess.js. Same shape as boot.js: run in an
// already-open lichess.org/training tab, solve, move to the next puzzle, repeat.
// Untested against a live tab — see chess.js header.
(async () => {
  if (window.__chessAuto && __chessAuto.running) return;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  window.__chessAuto = { running: true, count: 0, log: [] };
  while (__chessAuto.running) {
    let r;
    try { r = await __chessSolve(); } catch (e) { r = { ok: false, err: String(e) }; }
    __chessAuto.log.push(r); if (__chessAuto.log.length > 50) __chessAuto.log.shift();
    if (r.ok) __chessAuto.count++;
    await sleep(1500);
    location.href = '/training'; // loads the next puzzle; reload re-injects this file
    return; // ponytail: navigation kills this context — the page-load re-injector restarts the loop
  }
})();

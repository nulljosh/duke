# Roadmap

## Where the run stopped
2026-09-03 17:10 PDT: stopped for the day at unit 228 level 4, XP 200,462, in
queue mode with 175 of the 186 skipped Math levels still queued (see
scripts/queue.json and `duoAuto.queue` in state.json). Math course itself is
COMPLETE (units past 411 are empty). Resume: load the remaining queue into
duoAuto with running:true and inject duo.js + boot.js.

## Open
- [ ] Piecewise construction: place the endpoint from the stated definition
- [ ] Revisit known-bad levels: 150 L4, 153 L4, 160 L3, 148 L3
- [ ] Dot plots and spinner wedges still need real OS mouse input
- [ ] Math runs to unit 411; ~200 units remain

## Braindump 2026-09-04
- [x] Chess autopilot v0 shipped: scripts/chess.js + chessBoot.js solve
  lichess.org/training puzzles. No engine needed — lichess ships the puzzle
  solution to the client up front, so the solver just replays it via chessground
  mouse events.
- [x] Gaps closed same day: orientation guess now fails loudly instead of
  defaulting to white (was misplaying every black puzzle); chessBoot.js posts
  state/heartbeat to serve.py (chess-state.json / chess-hb.json) like boot.js
  does; ext.js + manifest.json auto-inject chess.js/chessBoot.js on
  lichess.org/training the same way duo.js is injected on Duolingo; pure logic
  (extractSolution, squareCenter) split out with a node self-check,
  scripts/test_chess.mjs — run `node scripts/test_chess.mjs`.
- [ ] **Still untested against a live tab.** First run will likely need a
  selector fix in findSolution() (the JSON script-tag shape lichess embeds the
  solution in) — that part can only be confirmed by opening a real puzzle.
- [ ] No wrong-move/failure recovery beyond counting errors in chess-state.json.
- [ ] Broaden language-learning support generally (more Duolingo courses beyond
  Math) — keep the existing Math autopilot as-is.
- [ ] duo.js is 21,270 lines — audit for dead solver paths / consolidation, does it need to be this big
- [ ] Refresh app icon — custom, tongue-out mascot
- [ ] Keep the stars/x-eyes touch on the current icon, it's good

## How to run it cheaply
Unattended now: the scripts/ extension re-injects on every page load, so no
session polls at all (2026-09-02). Check scripts/state.json instead.
The old note: the polling loop needs no reasoning — `duo.js` solves in the page. Run it in its
own small session on a cheap model, and only bring a stronger model in when a
question type has no solver. A long session re-sends its whole history on every
30-second poll, which is the expensive way to watch a status line.

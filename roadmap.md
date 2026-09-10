# Roadmap

## Open
- [ ] Music track: no known challenge shapes yet. `solveLang()` returns null
  and `run.mjs` skips + logs to `log.jsonl` — check that log for real shapes
  before writing a branch, don't guess.
- [ ] Bot chess matches (`chal().match`) lose at engine level 3 — `lasker()`
  only searches one extra ply past `jsChessEngine.aiMove`, capped at level 4
  (level 5 can take >10s in-page). A stronger search is a real fix, not yet
  attempted.
- [ ] `run.mjs`'s orchestration (drag retries, story loop, tree-walk
  fallback) has no test coverage beyond `courseIdFor` now — most of it is
  `page.evaluate`-bound and needs a live browser, not a pure-function test.

## Done
- 2026-09-10: `courseIdFor` extracted to `courseId.mjs` + tested
  (`courseId.test.mjs`) — the rest of run.mjs's orchestration is browser-bound
  and not unit-testable the same way. Surfaced a real bug while verifying the
  refactor: a request landing during the startup window threw a TDZ error
  synchronously inside the http handler and killed the whole process. Fixed
  with a try/catch around the router → 503 instead of a crash; verified by
  hitting /fen immediately after restart. Commit: d4b4805.
- 2026-09-10: chess underpromotion puzzle infinite loop fixed. Root cause:
  promo() was hardcoding a click on the queen's slot (x=370) regardless of
  which piece a puzzle required, so rook/bishop/knight finales always graded
  wrong and got re-served forever. Fixed by extracting piece selection into
  a self-calibrating picker that learns the correct slot index per piece
  from real grades (bump on wrong, lock on correct, persist in
  promo-calib.json). Verified live on restart; solver cleared the
  previously-stuck d7d8n puzzle plus several more underpromotion puzzles.
  Commit: 60cf224.
- 2026-09-09: full engine rewrite — one Playwright runner (`scripts/run.mjs
  <track>`) replaces the Chrome-extension + boot.js/langBoot.js/serve.py
  stack (all deleted). See CLAUDE.md for the current architecture.
- 2026-09-09: `run.mjs` now writes a heartbeat to `state.json` every loop
  iteration (not just on solved events), so a hung browser session (stuck
  navigation, dead CDP connection) shows a stalled `at` timestamp instead of
  looking identical to "working, just between puzzles."
- 2026-09-08/09: chess puzzles solved via `chessPuzzleInfo` +
  `moveEvaluationsForPositions`; ~1,700 puzzles overnight, 0 misses.
  Language solver verified live (Spanish, Greek). Math pruned from 21.6k to
  19.1k lines by hit-trace, `mathjs.min.js` replaces the hand-rolled LaTeX
  evaluator.

# Working on this solver

## Layout (2026-09-09 rewrite)

One Playwright runner, `scripts/run.mjs <track>`, replaces the three
overlapping loops (`boot.js` in-page, `langBoot.js` in-page, `chessRunner.mjs`
Playwright) plus the Chrome-extension injection path (`ext.js`,
`autostart.js`, `manifest.json`) and the plain-file server (`serve.py`). All
deleted — `run.mjs` owns the browser directly, so there is nothing left to
inject into.

- `scripts/solver.js` — the browser-side solver for language, chess, and
  music. Loaded via `page.addScriptTag`. Self-contained: does not depend on
  `math-legacy.js`.
- `scripts/math-legacy.js` — the untouched former `duo.js`, kept whole for
  the math track only. Its grader-extraction + geometry pipeline
  (transformations, trig, statistics, LaTeX parsing, widget-family solvers —
  see the git history on this file pre-rewrite for the deleted SKILL.md
  sections documenting them) is genuinely too large to safely re-derive from
  a mechanical "which wrapper is live" pass; `duo.js` had accumulated ~30
  layers of `const base = D.foo; D.foo = wrap(base)` chains where the LATEST
  wrapper still calls the older ones as fallback, so nothing in that chain
  is actually dead weight. If you touch math logic, this is the file — the
  same "never stack another wrapper" rule below still applies inside it.
- `scripts/js-chess-engine.js` — bundled js-chess-engine 2.4.6, used for bot
  matches (`chal().match`) only, not puzzles.
- `scripts/solver.test.mjs` — pure-function tests (`node --test`), no
  browser: tile-text normalisation, `puzzleBest()`'s FEN-key lookup, chess
  board/promotion geometry.

## The one rule that matters: don't stack wrappers

This is exactly how `duo.js` (now `math-legacy.js`) grew to 21k+ lines with
only a fraction actually live. If a fix "doesn't take", or two behaviours
both fire and undo each other, an OLDER version of that function is still in
the chain somewhere above your new one. **Delete the stale block. Never
layer another one on top of it.** This is a git repo — delete freely,
history is recoverable.

`solver.js` has no wrapper chains by design: one definition per function.
Keep it that way — edit the function in place, don't shadow it.

## Traps that keep costing time (language / chess / stories — solver.js)

- Choice `innerText` is doubled ("eștiești"). `strip()` removes a leading
  shortcut digit and compares by exact match — never `includes()` (a bare
  "e" false-matches inside "ești").
- Word-bank tiles in language challenges are real `<button>`s and DO take a
  native `.click()` — this is NOT true of Math's token bank (a different,
  synthetic-event-hostile widget in `math-legacy.js`). Don't port a fix from
  one to the other.
- The chess board is a Rive **canvas**. Synthetic pointer events do nothing.
  A click needs a real held mouse-down (90ms) then up, and two clicks need
  ~550ms between them or the second is swallowed.
- `chal().match.boardFen` and `challengeState.guess.moveHistory` both lag the
  bot's actual reply. `liveFen()` (a `useRef` found by walking fiber
  `memoizedState` a few frames above the board canvas) is the only live
  position — always plan from it, never from those two.
- `computer`/Playwright-mouse coordinates from `chessPlan()`/`chessSquares()`
  are in **screenshot space** (1568px wide), not CSS px — scale by
  `1568/innerWidth` going in, and back by the inverse before calling
  `page.mouse`. `run.mjs` already does this; don't double-apply it.
- Promotion picker geometry (`promo()`) is inset from the board rect by
  measured constants (9.75%/10%/80% for the board, 0.8s/2.2s for the queen
  icon) — if Duolingo resizes the board these need re-measuring against a
  screenshot, not guessed.
- `solveLang()` returns `null` on any shape it doesn't recognise —
  `run.mjs` then skips via `player-skip` and logs the challenge's
  `correct*`/`solution*`/`choices`/`pairs` keys to `log.jsonl`. Check that
  log before writing a new branch, don't guess the shape.

## Testing a change

```bash
node --check scripts/solver.js && node --check scripts/run.mjs
node --test scripts/solver.test.mjs
```

For a live check, run `node run.mjs <track>` — it launches its own Chromium,
no separate reload step needed (edit the file, Ctrl-C, rerun).

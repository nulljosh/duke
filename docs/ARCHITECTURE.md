# Architecture

Pwnlingo is a Duolingo solver. Automates Duolingo lessons via browser automation (Playwright). Solves three tracks: language (word-bank, translation, multiple-choice), chess (piece movement planning, promotion detection), and math (arithmetic, algebra, equations). Menu bar macOS app shows XP progress; live track switching. No account login (runs with an existing Duolingo profile, cookie-based auth).

## How it runs

`scripts/run.mjs` (Playwright runner) launches Chromium, navigates to Duolingo, and runs `scripts/solver.js` in the page context via `page.addScriptTag()`. Solver watches for lesson challenges and solves them based on type. For unsolvable challenges, runner calls `player-skip` and logs the challenge shape to `log.jsonl` for analysis. Math track uses `scripts/math.js` (pruned from 21k+ lines of legacy wrappers) and `scripts/mathjs.min.js` (UMD bundle for expression evaluation). Language track uses `scripts/solver.js`'s `solveLang()`. Chess track uses `scripts/solver.js`'s `solveLang()` plus board-geometry functions (`chessPlan()`, `chessSquares()`).

Lessons that require real mouse drags (math token-bank, chess pieces) fall back from synthetic pointer events to real Playwright mouse moves. This is one case where real hardware interaction beats DOM automation.

Menu bar status app (`app/App/ContentView.swift`) shows XP, streak, current level, available tracks. Clicking a track calls `POST /switch?track=<x>` on the runner's HTTP server (port 8737), which updates `pendingTrack`; the runner picks it up at the top of its loop and switches via `setCourse()`.

## Files

| File | What it owns |
|---|---|
| `scripts/run.mjs` | Playwright main loop: launch browser, inject solver, poll for challenges, handle special cases (drag, skip, retry), log unsolvable shapes, track switching |
| `scripts/solver.js` | Browser-side challenge solver: language (`solveLang`), chess (`solveChess`), stories (`solveStories`), shared helpers (choice text normalization, FEN lookup) |
| `scripts/math.js` | Math solver (pruned from 21k+ lines): parse LaTeX expressions, solve arithmetic/algebra/equations, geometry pipelines, statistics solvers |
| `scripts/mathjs.min.js` | mathjs UMD bundle for expression evaluation (math track only) |
| `scripts/js-chess-engine.js` | Bundled js-chess-engine 2.4.6 for bot match solving |
| `scripts/solver.test.mjs` | Unit tests (no browser): tile normalization, FEN lookup, board geometry, promotion picker |
| `app/App/ContentView.swift` | macOS menu bar: XP display, streak, tracks array, track switcher buttons |
| `app/App/PwnlingoStatus.swift` | macOS app entry and menu bar integration |
| `app/project.yml` | XcodeGen: scheme `PwnlingoStatus-macOS`, builds to fixed derivedData path for launchd |
| `~/Library/LaunchAgents/com.nulljosh.pwnlingo-status.plist` | LaunchAgent: keeps menu bar app running, restarts on edit via `killall` |

## Challenge types

**Language**: word-bank tiles (click-based), translation (text input), multiple-choice, matching, grading.
**Chess**: puzzle (click-and-drag pieces, check board state from Rive canvas via fiber walk), bot match (call chess-engine, plan moves).
**Math**: arithmetic, algebra, geometry (transformations, trig, statistics), expression evaluation.
**Stories**: branching dialogue (click choices, read outcomes).

Unsolvable shapes are logged with their `correct*`/`solution*`/`choices`/`pairs` keys for debugging.

## Key tricks

- **Real mouse for drags**: synthetic pointer events (`dragXY()`) do not work on math token-bank or chess Rive canvas. Playwright mouse moves work.
- **Live board state from fiber**: `liveFen()` reads the Rive canvas state via fiber `memoizedState` walk (only live position; `chal().match.boardFen` lags the bot's reply).
- **Choice text is doubled**: `innerText` on word-bank tiles includes a shortcut digit repeated. Strip and compare by exact match, never `includes()`.
- **Screenshot vs CSS coordinates**: chess pieces from `chessPlan()` are in screenshot space (1568px), not CSS px. Scale by `1568/innerWidth` before calling `page.mouse`.
- **Promotion picker geometry**: inset from board by measured constants (9.75%, 10%, 80%, etc). If Duolingo resizes the board, re-measure from a screenshot.
- **No wrapper stacking**: `math.js` grew to 21k+ lines by layering wrappers. Delete stale code instead of shadowing it. One definition per function.

## Build and test

```bash
# Syntax check
node --check scripts/solver.js && node --check scripts/run.mjs && node --check scripts/math.js

# Unit tests
node --test scripts/solver.test.mjs

# Live run
node scripts/run.mjs <track>

# macOS menu bar app (after editing app/App/*.swift)
cd app && xcodegen generate
xcodebuild -scheme PwnlingoStatus-macOS -configuration Debug -derivedDataPath build build
killall Pwnlingo  # launchd restarts it from the new binary within ~10s
```

## Gotchas

- Menu bar app must build to the fixed derivedData path so launchd restarts the updated binary, not spawn a second orphaned copy.
- The chess board is a Rive canvas (not DOM). Clicks need real held mouse-down (90ms) + up; two clicks need ~550ms between them.
- Language tiles include shortcut digits in `innerText`. Strip them before comparing against the answer.
- Math drag solver (`dragXY()`) uses synthetic events and does not work. External real mouse drag works.

# Architecture

![Duke architecture](../architecture.svg)

One Node runner plays Duolingo in its own Chromium window. A menu bar app keeps the runner alive. Every client reads the runner's port.

## How it runs

`scripts/run.mjs <track>` launches Chromium on a saved profile, injects `solver.js` (languages, chess, stories) or `math.js` (math) into the page, and loops: solve, click through, reopen. Drags and chess moves use a real Playwright mouse, because Duolingo ignores synthetic events.

Between lessons it reads the daily quests and switches course when they stall, sends the friend gift, opens chests, and guards the streak after 6pm. `xpRates()` in `scripts/guards.mjs` turns the log into XP per hour per course, and `fastestTrack()` picks the next course to play.

The runner serves its state on port 8737 and takes `POST /switch`, `/pause` and `/resume`. The Pages function `functions/api/live.js` caches that state for 10 seconds through the tunnel at `surf-status.jaybulb.com`, so the landing can show live lessons without visitors reaching the Mac.

## Files

| File | What it owns |
|---|---|
| `scripts/run.mjs` | The loop, the browser, the port, course switching |
| `scripts/solver.js` | Language, chess and story answers, one definition per function |
| `scripts/math.js` | Math answers, with `mathjs.min.js` for expressions |
| `scripts/guards.mjs` | Pure decisions: stalls, streak risk, XP rates, quest focus |
| `scripts/*.test.mjs` | Node tests, no browser |
| `app/` | SwiftUI status app for macOS, iOS and watchOS (xcodegen) |
| `app/App/SolverProcess.swift` | Starts the runner and the tunnel, restarts both when they go quiet |
| `kmp/` | Compose Multiplatform client for Android, Windows and Linux |
| `tui/` | `duke-tui`, a one-shot terminal status card |
| `functions/api/live.js` | Edge-cached live state for the landing |
| `web/` | The landing at duke.jaybulb.com |
| `brand/` | Design system: tokens, mark, icon, Duke Sans notes |

## Build and test

```sh
node --check scripts/solver.js && node --check scripts/run.mjs && node --check scripts/math.js
node --test scripts/*.test.mjs
sh deploy.sh                      # landing: copies tokens and fonts, deploys Pages
```

The menu bar app's rebuild steps are in `CLAUDE.md`. It must be copied to `~/Applications/Duke.app`, where the LaunchAgent runs it.

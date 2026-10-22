# Surf Technical Whitepaper

**v2.2.0** | October 2026

Surf is a personal Duolingo autopilot. It plays language, math and chess courses in a real Chromium window, reading answers out of the client's own grader instead of guessing. One Node runner does the playing. A native status app on every platform shows what it is doing, and a menu bar app on the Mac keeps it alive.

## Reading the answer key

Duolingo draws each exercise from a React component, and that component still holds the answer. `chal()` walks up the fiber tree from the visible widget until it finds `memoizedProps.challenge`, the same object the grader reads. That object is the one place the answer can't be wrong.

Chess puzzles carry their solution too. Surf reads `moveEvaluationsForPositions`, keyed by the live board, because `correctMoves` mixes steps with alternatives. The board is a Rive canvas, so every move is a real held mouse click about 550 ms apart. Faster clicks get dropped.

## By course

**Languages** (`solver.js`): one dispatch over the challenge fields. Word bank, typed translate, cloze, pairs, tap complete and stories. Listen exercises are skipped, not guessed.

**Math** (`math.js`): driven through `autoLesson()`. Drag widgets get a real Playwright mouse, because Duolingo's token bank ignores synthetic events. Expressions go through math.js.

**Chess**: puzzles from the evaluations above, bot matches by Stockfish with a bundled engine as the fallback, always planned from `liveFen()`, the only position that is never stale.

## The runner

`scripts/run.mjs <track>` launches Chromium on its own profile, injects the solver and loops: solve, click through, reopen. Every tick writes `state.json`, so a frozen browser shows a stale timestamp instead of looking idle. A tiny HTTP server on port 8737 serves that state and takes track switches, pauses and voice toggles.

It runs for weeks. A lesson that loops gets escaped, the runner pauses when the disk is nearly full, a course that earns nothing is benched for a day, and after 6pm with no XP it finishes a language lesson so the streak survives. It measures XP per hour for every course and moves to the best earner when one finishes or stalls.

## Staying up

A LaunchAgent keeps the menu bar app running from `~/Applications/Surf.app`, outside any build folder a disk cleanup might wipe. The app starts the runner, restarts it after a crash, and pings port 8737 every minute in case it died quietly. A second runner started by mistake exits on its own when the port is taken.

## Clients

SwiftUI on macOS, iOS and watchOS, Compose Multiplatform on Android, Windows and Linux, and a terminal client. All of them read the same port, locally or through a Cloudflare tunnel at `surf-status.jaybulb.com`. Reads are open. Pausing and switching need a token.

## Ethics

Automated play is against Duolingo's terms, and the XP still ranks against real people. Surf is for one account and for reading, not for distribution.

MIT 2026, Joshua Trommel

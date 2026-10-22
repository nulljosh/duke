# Surf Technical Whitepaper

**v2.1.0** | September 2026

Keeping a language streak, a chess league rank and a math course all moving
takes daily time that could go somewhere else, and the app's own grading
logic already knows the right answer before a person needs to guess it.
Surf is a personal Duolingo autopilot. It plays language, math, chess and
music tracks back to back, reading answers straight out of the client-side
grader instead of guessing at pixels, because the grader's own object is
ground truth and pixel matching would be slower and less reliable for no
benefit. One Playwright runner drives everything: its own persistent
Chromium profile, real trusted mouse clicks (needed because Duolingo's own
widgets reject synthetic ones), no browser extension, no operator once
started. A native iOS/macOS app shows live progress without keeping a session
open, since checking on the runner shouldn't require leaving a browser tab
open all day.

## The grading problem

Duolingo's challenge data lives on a React fiber, not in the DOM, so there is
no DOM element to read the right answer off. `chal()` walks up from the
mounted challenge element until it finds `memoizedProps.challenge` — the same
object the grader itself reads, which is the one place the answer can't be
wrong. Chess puzzles carry `chessPuzzleInfo.correctMoves` and, more reliably,
`moveEvaluationsForPositions` keyed by live FEN, since `correctMoves` alone
mixes steps and alternatives and picking the wrong one fails a puzzle that
was actually solvable. The chess board is a Rive canvas: synthetic
pointer events do nothing, so every click is a real, held (down/90ms/up)
Playwright mouse click, ~550ms apart, timing that exists because faster
clicks get dropped by the canvas.

## Solver by track

- **Language** (`solver.js`) — one field-driven dispatch over the fiber's
  `challenge` object: word bank, typed translate, cloze, match-the-pairs,
  tap-complete. Listen/speak always skip, never guesses audio, because a
  wrong guess on audio content risks marking a real listening challenge wrong
  for no gain.
- **Math** (`math.js`, pruned from a 21k-line legacy file by an instrumented
  hit-trace) — driven through `autoLesson()`; drag widgets get a real
  Playwright mouse, since Duolingo's token-bank/slider widgets never respond
  to synthetic events.
- **Chess** (`solver.js` + bundled `js-chess-engine`) — puzzles via
  `moveEvaluationsForPositions`; bot matches via a one-ply-deeper "Lasker"
  search over `liveFen()`, the only position that isn't stale, since planning
  from a stale board state plays a move against a position that no longer
  exists.
- **Music** — unimplemented. No known challenge shapes yet; the runner logs
  and skips until one shows up, rather than guessing at a shape that hasn't
  been observed.

## Runner

`scripts/run.mjs <track>` launches Chromium, injects the solver, and loops:
solve, click through end screens, handle stories, skip DuoRadio, reopen.
Writes a heartbeat to `state.json` on every loop tick, so a hung browser
session shows a stalled timestamp instead of looking identical to normal idle
time, since a silently frozen runner would otherwise look like it's simply
between lessons. Also serves `state.json`/`log.jsonl` over a small stdlib HTTP
endpoint (`:8737`) for the companion app to poll over LAN, which needs no
extra dependency to expose that state.

## Status app

Every client reads the same runner endpoints, so there is one source of
truth: SwiftUI for iOS/macOS/watchOS (`app/`, xcodegen, no checked-in
`.xcodeproj`), Compose Multiplatform for Android/Windows/Linux (`kmp/`), and
a terminal client (`tui/`). Chess renders as a real animated board; language
and math show the live prompt and answer choices, because watching the
runner work is more useful than a bare status light. Balance mode plays
whichever course is furthest behind instead of grinding one to completion
while the rest stall, so no single course is left behind while another one
runs unattended; finished courses auto-advance and show a measured ETA.
Red warning if the heartbeat goes stale.

## Ethics note

Automated play is against Duolingo's ToS, and the XP still ranks against real
people in a league, which is why this exists for personal use on one account,
not distribution.

## License

MIT 2026, Joshua Trommel

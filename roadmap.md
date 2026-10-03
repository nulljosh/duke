# Roadmap

## Benchmarks: finishing Duolingo (measured 2026-10-02)
"Finished" means every course on the account at 100%, plus math and chess. Run
`node scripts/bench.mjs` for the live numbers; it reads `log.jsonl` only.

Where we are: 441k XP, 23 language courses tracked, 2 at 100% (Greek, Hindi),
Russian at 99%. Average course is 20%. Pace over the last 5 days is about 69
course-percent points a day and 16k XP a day. Finishing the 23 tracked courses
is roughly 1.8k points, about 570k more XP, so the end lands near 1M XP.

| Milestone | Gate | ETA from 10-02 |
|---|---|---|
| 500k XP | total XP | 4 days |
| Average course 25% | bench.mjs | 2 days |
| Russian, Polish, Arabic at 100% | the three furthest along | 1 week |
| Chess at 100% | 328 levels left at 85% | 1 week |
| Average course 50% | bench.mjs | 10 days |
| 750k XP | total XP | 3 weeks |
| Average course 75% | bench.mjs | 19 days |
| Math at 100% | 75% now, unit list not yet counted | 3 weeks |
| Every tracked course at 100% | bench.mjs | 27 days |
| 1M XP | total XP | about 5 weeks |

Rules for the ETAs: they assume no track sits stalled for a full day, and the
pace is a straight line, so the last courses will run slower than the early
ones. Re-run bench.mjs weekly and fix the dates here. The track list is the 23
the runner can see today; if Duolingo shows more courses on the account the
100% gate moves with them.

What can slip the dates, in order: speaking exercises (fixed 10-02, watch the
English and Russian yield), tracks that fail to open a lesson (ja, el),
a full disk (the runner now pauses under 2GB free), and Duolingo changing a
screen the solver reads.

## Open
- [ ] Finish the Cruise rename (display text done 2026-10-02). Left on purpose: launchd label, bundle ids, PRODUCT_NAME Pwnlingo (launchd path), Kotlin package, GitHub repo, CF Pages project, hostnames. Hostnames follow the portfolio domain (separate decision, see the jaybulb migration): when it moves, point cruise.<portfolio> and cruise-status.<portfolio> at the landing and tunnel, then swap the launchd plist and rename the repo.
- [ ] MONEY.md + GTM row, demo GIF on landing, README note that automating Duolingo is against their terms.
- [ ] Verify the bare-translate fix live on the next ja round. Log data (2026-09-27)
  showed the real gap was not tapComplete (44 misses) but translate (849, mostly ja):
  zero tiles and no text box on screen, so the keyboard fallback never ran. New
  `type:bare` branch opens keyboard mode and types the solution. If misses continue,
  the unknown-challenge log now carries a `dt` list of on-screen data-test ids.
- [ ] `run.mjs`'s browser-bound orchestration (drag retries, story loop,
  tree-walk fallback) still has no test coverage — most of it is
  `page.evaluate`-bound and needs a live browser, not a pure-function test.
  Pure orchestration functions (cycleDue, nextInRotation, courseIdFor, guards)
  are now fully tested.
- [ ] Bot chess matches search one extra ply deeper (level 5) if it can be
  done without blocking the page for >10s — needs a Web Worker running
  `jsChessEngine` off the main thread with a real cancellable timeout, not
  attempted yet.

## Won't fix
- Music track: not a solver gap. Verified live (2026-09-10) — this account's
  `/learn` page has zero mention of "music" anywhere in its DOM. Duolingo
  Music isn't served on desktop web at all here, so no course id or solver
  branch fixes it. `courseIdFor`'s `MUSIC_MU` entry and the `music` CLI arg
  stay wired up in case that ever changes account-side.

## Done
- 2026-10-02: Speaking exercises no longer eat a lesson. Russian logged 25 lessons in a row at zero XP because the record button never matched and the runner quit after five tries. It now takes the Skip button when one is on screen. Russian earned XP again on the next lesson. Also: the runner pauses itself under 2GB free disk, claims finished quest rewards every 30 min (logs `quest-visit` with the buttons it saw when there is nothing to claim, so a wrong label shows up), and `scripts/bench.mjs` prints the progress ladder above. Verified from the logs that the bare-translate fix works: no unrecognized ja translate questions in 130 lessons since, down from about 250 a day.
- 2026-09-19: Stalled-loop fixed. The solver had been stuck in 1033 identical
  cycles with zero XP for 23 hours. Two bugs were feeding each other: close/quit
  buttons didn't end the session server-side, so the next lesson resumed the
  exact same story; fixed by setting forceQuitOnOpen. Rotation logic was
  picking the least-XP course, which was the blacklisted track, creating
  pt -> ja -> rotate -> pt forever; rotation now skips stalled tracks. Also
  fixed transliterationAssist and patternTapComplete challenge shapes (245
  failures), and added DOM instrumentation for unknown challenges. Commits
  f854f6a, 4efc3ad, 3e5fd0f. 46 tests green, XP flowing.
- 2026-09-11: Fixed menu bar icon and animated XP ticker. Menu bar only checked `poller.stale` for heartbeat timeout but not `poller.unreachable`, so when the runner lost connection it froze showing the last XP number instead of flipping to the warning icon. Now checks both conditions. Added `.contentTransition(.numericText())` + `.animation(.snappy)` to the XP Text so the counter rolls like an odometer when numbers update. Restarted the Cloudflare Tunnel that had crashed (error 1033). Commit d91919f.
- 2026-10-01: Runner self-heals a wiped Playwright cache (installs chromium with its own node, retries) and exits 0 when another runner owns port 8737, so the status app stops respawning it every 5s. Root cause of the 09-29 to 10-01 outage: disk full, then cleanup wiped the browser cache.
- 2026-09-11: Polished menu bar with pulse effect on warning icon (`.symbolEffect(.pulse)`) and cross-fade transitions between board/prompt/screenshot panels (`.transition(.blurReplace)` + `.animation(.smooth)`). Discovered rebuild gotcha: building to /tmp spawned duplicate orphaned Pwnlingo processes outside launchd's control. The app must always rebuild to its fixed launchd-managed path (app/build/Build/Products/Debug/Pwnlingo.app) to avoid forking a second unmanaged copy; documented in pwnlingo's CLAUDE.md rebuild/restart workflow section. Commits 2dca192, c5bbc20.
- 2026-09-11: Tunnel auto-recovery wired: `SolverProcess.watchTunnel()` runs an immediate reachability check plus a repeating 60s Timer, both calling `startTunnelIfNeeded()`. Wired into PwnlingoStatusApp.init() so it starts when the launchd-managed menu bar app launches. Context: earlier the cloudflared tunnel died silently while the local runner stayed healthy, creating a dead API bridge that went unnoticed until manual restart. Now the already-launchd-kept-alive status app self-heals the tunnel automatically on its own timer, respecting the "no background automation" rule by piggybacking on a process already allowed to run. Rebuilt to the launchd path, restarted, confirmed tunnel recovered (200 on pwnlingo-status.heyitsmejosh.com/state) with exactly one app instance running. Commit e3eb635.
- 2026-09-11: Fixed track label lying after auto-rotate and made auto-restart survive mid-session crashes. The "language tree exhausted" rotate fallback patched Duolingo's currentCourseId directly but never updated the local `track` variable the UI reads, so after a rotate the menu bar kept showing the OLD language while actually solving the NEW one (caught live: showed French while solving Yiddish/Hebrew-script content) — fixed by reverse-mapping the rotated course id back to a track code and syncing it the same way the normal /switch path does. Also replaced the one-shot auto-start-on-launch latch (only fired once per app launch) with a 15s-debounced retry on every unreachable transition, so an unrecoverable Playwright crash mid-session ("Browser is gone") now self-heals same as a reboot does instead of leaving the app frozen. Verified live: rebuilt, restarted, solver auto-started clean with zero clicks. Commit 9708357.
- 2026-09-11: Fixed Mac app stability on reboot: dropped redundant SMAppService login item registration that was launching two copies of the status app, and moved the auto-kick solver trigger from a dead-code ContentView to the MenuBarLabel (which is guaranteed live at launch) with corrected node PATH invocation so fnm's stable Node version is used instead of relying on the login shell's PATH (absent for launchd GUI apps). Verified live: solver auto-starts on reboot without manual interaction. Commits c09a4ce, b36abf0.
- 2026-09-10: Menu bar native previews for every track (chess board, language
  prompt+choice tiles, math prompt+choices+pattern grid read off the DOM via
  `__duo.widget()`), screenshot now only a last-resort fallback. Fixed
  `openLesson()` silently accepting a stale, wrong-course lesson left open
  from a previous run or switch (a cold start or `/switch` kept resolving
  the OLD track's abandoned session under the NEW track's label) — a
  one-shot `forceQuitOnOpen` now dismisses it first. Bot chess matches
  bumped from level 3 to a verified-safe level 4. Confirmed `native-release.yml`
  (Android APK, Windows .msi, Linux .deb) builds clean. Added SECURITY.md,
  architecture.svg, CI test workflow — repo-standard gaps closed. Ruled out
  the music track as a solver bug (see Won't fix above). Commits 52c5b19,
  672b5fa, c109cfa, 80fb948, 1699165, b71854a, f8a5222, aeee73b.
- 2026-09-10: Topic-cycling settings: auto-rotate chess/math/all languages on a timer or lesson-count trigger (disabled by default), persists to cycle.json, settable via new /cycle endpoint and macOS Settings toggle with mode picker (time/count) and stepper control. Verified live: enabled count-mode at value=2, watched it actually switch chess→math after 2 real puzzles. Also added launchd LaunchAgent watchdog for the status app itself (com.nulljosh.pwnlingo-status, KeepAlive enabled, ~/Library/LaunchAgents/, not in repo) so crashes auto-relaunch within seconds — deliberate exception to no-background-automation rule, scoped to this one app. Commit: 27f075c.
- 2026-09-10: Tunnel + runner stability hardened: fixed crashes when tunnel was unreachable, made Start button relaunch both solver and cloudflared tunnel together, replaced fragile pgrep checks with real HTTP reachability probes. Fixed critical track-switching bug where old session didn't quit, causing state/UI mismatch. Added 15s watchdog for page.evaluate() timeouts (found silently hanging on unrecognized Klingon word-bank exercise). Wired SMAppService open-at-login (macOS) and equivalent Kotlin auto-start (Windows/Linux desktop). Extracted rate-limiting and log-rotation guards into a tested guards.mjs module. Removed duplicate macOS window (menu-bar only now), added hide-dock-icon setting with NSApp-nil crash fix. Added chess puzzle ledger (puzzles.jsonl) for permanent solved-puzzle records. Commits 92ca405 (watchdog), 0b12ccb (hide-dock), 6a927a5 (menu-bar), 259f0b7 (track-switch fix), and earlier.
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

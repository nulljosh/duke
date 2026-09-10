# Roadmap

## Open
- [ ] `run.mjs`'s orchestration (drag retries, story loop, tree-walk
  fallback) has no test coverage beyond `courseIdFor`/`guards`/`solver` now —
  most of it is `page.evaluate`-bound and needs a live browser, not a pure-
  function test.
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

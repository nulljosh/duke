<img src="icon.svg" width="80" style="border-radius:18px">

# pwnlingo

[![MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Live:** https://pwnlingo.heyitsmejosh.com

Plays Duolingo for you. Languages, math, chess. Music is wired up too, but Duolingo doesn't serve it on desktop web, so it has nothing to play yet.

It runs its own Chrome, signed in with your session cookie, and reads each question's answer out of the page's React state. Where there is no answer on the page (math), it solves the question itself. Nothing is guessed. A wrong answer means a bug, and the log says which question.

<img src="progress.svg" width="460">

## Architecture

<img src="architecture.svg" width="600">

## Run

```sh
cd scripts
echo "<your jwt_token cookie>" > jwt.txt
node run.mjs es       # any language code
node run.mjs math
node run.mjs chess
node run.mjs music
```

One track at a time; Duolingo keeps one active course per account. Progress lands in `state.json`, every event in `log.jsonl`, and every language question and answer in `lessons.jsonl` so you can review what you practised.

`run.mjs` also serves `state.json`/`log.jsonl` over the LAN on port 8737, and switches track live on `POST /switch?track=<x>` — no restart needed. The status app (below) drives this.

## Runs itself

The status app is the only thing that starts `run.mjs`, and it's already
wired to survive a reboot and a crash:

- `~/Library/LaunchAgents/com.nulljosh.pwnlingo-status.plist` (RunAtLoad +
  KeepAlive) brings the status app itself back after login or a crash.
- The status app then starts `run.mjs` on its saved track, and restarts it
  5s after any unexpected exit (network blip, browser closed, anything but
  a genuinely missing Duolingo session, which needs a human to log back in).

To wire this up on a fresh machine: build the app once
(`cd app && xcodegen generate && xcodebuild -scheme PwnlingoStatus-macOS
-configuration Debug -derivedDataPath build build`), then
`launchctl load ~/Library/LaunchAgents/com.nulljosh.pwnlingo-status.plist`
(copy that plist in first if it's not already there — see `app/`). From then
on it survives reboots and crashes with no manual restarts.

## Status app

Native everywhere: SwiftUI on iOS/macOS/watchOS, Compose Multiplatform on Android/Windows/Linux, plus a terminal client (`pwnlingo-tui`). All poll the runner over the LAN or tunnel for the same state: current track, XP gained, puzzles/misses/matches or lesson count, live chess board, and the latest log line. Switch track or pause from any client, no terminal needed.

## Files

- `scripts/run.mjs` drives the browser, opens lessons, clicks through, rotates languages, serves LAN status + track switching.
- `scripts/solver.js` answers language, chess, and story questions.
- `scripts/math.js` answers math. It is large because math has no answer key on the page.
- `scripts/js-chess-engine.js` plays the chess bot.
- `app/` is the iOS/macOS status app (xcodegen, no checked-in `.xcodeproj`).
- `SKILL.md` and `CLAUDE.md` hold the gotchas that cost time. Read them before touching the solver.
- `web/` is the landing page at pwnlingo.heyitsmejosh.com.

## Honest notes

Automated play is against Duolingo's terms. XP earned this way ranks you against real people in your league. Listen questions are skipped. Speak questions are voiced with macOS `say` through a fake mic (the sentence is on the page already, same as any other answer key) — unverified against a live speak screen yet, falls back to skip if the record button isn't found. DuoRadio is skipped.

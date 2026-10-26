<img src="icon.svg" width="80">

[![version](https://img.shields.io/badge/version-2.2.0-0074D9)](WHITEPAPER.md) [![Apache 2.0](https://img.shields.io/badge/license-Apache_2.0-001F3F)](LICENSE)

Duke plays while you sleep: Duolingo (languages, math, chess), Factorio, Game Dev Tycoon and FEZ, around the clock. Named for Duke Kahanamoku. Formerly Surf, and Cruise before that.

**Live:** https://duke.jaybulb.com

It reads each question's answer out of the page's own React state and clicks it. Math has no answer on the page, so Duke solves those itself. Nothing is guessed. A shape it has never seen gets logged and skipped.

Automating Duolingo is against their terms and can get an account banned. This is a personal study, not a product.

<img src="docs/demo.gif" width="640">

## Features

- Plays every language course, math, and chess puzzles and bot matches.
- Keeps the streak: after 6pm with no XP today, it finishes a language lesson.
- Moves to the fastest-earning course when one finishes or stalls.
- Finishes the daily quests, opens chests, sends gifts.
- Starts at login and comes back on its own after a crash.
- Status apps for the Mac menu bar, iPhone, Watch, Android, Windows, Linux and the terminal.

## Run

```sh
cd scripts
echo "<your jwt_token cookie>" > jwt.txt
node run.mjs es    # a language code, math or chess
```

Progress lands in `state.json`, events in `log.jsonl`. Port 8737 serves the live state to the status apps and switches course on `POST /switch?track=<x>`.

## Starts at login

The menu bar app lives at `~/Applications/Duke.app`, and a LaunchAgent keeps it running. The app starts the runner, and starts it again whenever port 8737 stops answering. Build steps are in [CLAUDE.md](CLAUDE.md).

## Architecture

<img src="architecture.svg" width="640">

More in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the [whitepaper](WHITEPAPER.md). The brand kit is [brand/BRAND.md](brand/BRAND.md).

Apache 2.0, 2026 Joshua Trommel. [Privacy](PRIVACY.md).

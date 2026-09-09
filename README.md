<img src="icon.svg" width="80" style="border-radius:18px">

# pwnlingo

Plays Duolingo for you. Languages, math, chess, music.

It runs its own Chrome, signed in with your session cookie, and reads each question's answer out of the page's React state. Where there is no answer on the page (math), it solves the question itself. Nothing is guessed. A wrong answer means a bug, and the log says which question.

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

## Files

- `scripts/run.mjs` drives the browser, opens lessons, clicks through, rotates languages.
- `scripts/solver.js` answers language, chess, and story questions.
- `scripts/math.js` answers math. It is large because math has no answer key on the page.
- `scripts/js-chess-engine.js` plays the chess bot.
- `SKILL.md` and `CLAUDE.md` hold the gotchas that cost time. Read them before touching the solver.
- `web/` is the landing page at pwnlingo.heyitsmejosh.com.

## Honest notes

Automated play is against Duolingo's terms. XP earned this way ranks you against real people in your league. Speak and listen questions are skipped, DuoRadio is skipped, and chess bot matches are mostly lost; puzzles are what earn.

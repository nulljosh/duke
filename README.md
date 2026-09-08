<img src="icon.svg" width="80" style="border-radius:18px">

# pwnlingo

Plays Duolingo Math, Chess and language courses for you in a Chrome tab you're already signed into.

Claude doesn't answer the questions. It loads `scripts/duo.js` into the page, and that script reads the question, figures out the answer, and clicks. Claude only gets involved when a new kind of question shows up that the script can't handle. Then it writes a solver for it and restarts.

## What's in here

| Path | What it is |
|------|------------|
| `SKILL.md` | The `/duolingo` skill: how to start the loop and what to check on |
| `scripts/duo.js` | The solver. One big file, new question types get added to the end |
| `scripts/boot.js` | Math loop: walks levels by URL, posts progress to `state.json` |
| `scripts/langBoot.js` | Language loop: walks the tree by URL, skips radio, posts to `lang.json` |
| `scripts/chess.js`, `chessBoot.js` | Chess helpers and the puzzle/match loop |
| `scripts/js-chess-engine.js` | Chess engine for playing the bot |
| `scripts/serve.py` | Serves `duo.js` on port 8777, stores the progress files and the study ledger |
| `scripts/ext.js`, `manifest.json` | Chrome extension that re-injects the solver on every page load |
| `duo.py` | Helpers for the Duolingo API (courses, path) |
| `web/` | Landing page at pwnlingo.heyitsmejosh.com |

## Running it

```sh
python3 scripts/serve.py &
```

Then, in the lesson tab, run the boot snippet saved in `localStorage.duoBoot`. It loads the solver, runs `autoLesson()` over and over, and moves to the next level when one finishes.

## Math

Covers exponentials, transformations, statistics, geometry, trig, probability, counting, circles and parabolas, and 3D shapes.

Two question types ignore fake clicks and need a real mouse: dot plots and spinner wedges. The script works out where to click and drag, but a person or the Chrome `computer` tool has to do it.

## Chess

Puzzles are easy: the answer is sitting in the page's React state (`chessPuzzleInfo.correctMoves`). The board is a canvas, so only real clicks work. `chessNext()` turns the moves into screen coordinates and one `computer` call plays them.

Games against the bot: `liveFen()` reads the board position from the page, the chess engine picks a move, and `matchTurn()` waits until it's our turn. To pick a move, the engine looks at the position twice, once at normal depth and once a bit deeper, and goes with the deeper answer if they disagree. First game won in 19 moves.

## Language

`solveLang()` reads the correct answer out of the page state and clicks or types it: multiple choice, word bank, typed translations, cloze, matching pairs, and stories. Listening and speaking exercises just hit skip. First live lesson passed on 2026-09-08.

`langBoot.js` runs the course. It walks the tree by URL so it can skip DuoRadio nodes, which need audio, opens each level a few times, and stops when XP hits the target. Progress lands in `scripts/lang.json`.

To change course, run `await __duo.course('es')` (or `'math'`, `'chess'`, `'music'`) and do a full reload of `/learn`. The course is server-side state, so two tabs can't run two courses at once.

## Study ledger

Every prompt and answer the solver sees is appended to `scripts/lessons.jsonl`, so the run doubles as a record of what the course actually asked. Local only.

## What's missing

- Language solver has done one lesson. Question shapes it doesn't know are logged to `lang.json` under `miss` and skipped.
- Dot plots and spinner wedges still need a person or the `computer` tool.
- If the bot makes a bad chess move, nothing recovers from it. It just gets counted.
- The whole thing still goes through Chrome, the extension and a Claude session. A Playwright runner could replace all three.

# Contributing to Duke

```sh
git clone https://github.com/nulljosh/duke.git
cd duke/scripts && npm install
node --test *.test.mjs
```

Read `CLAUDE.md` and `SKILL.md` before touching the solver. They hold the traps that cost the most time.

Keep the diff to the one thing you are fixing. Match the style of the file you touch. Edit a function in place, never wrap it in another one.

Found a bug? Open an issue with the question that went wrong. The log line from `scripts/log.jsonl` is the best repro.

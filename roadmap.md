# Roadmap

## Where the run stopped
2026-09-03 16:50 PDT: MATH COURSE COMPLETE. Final XP 200,337 (crossed 200K at
~08:30). Units past 411 are empty: every level "completes" with 0 questions and
0 XP, so boot.js walked 411 -> 538 for seven hours doing nothing. TODO: make
boot.js stop when a lesson opens with no challenge / 0 done three levels in a
row. 186 levels skipped over the whole run (drag-a-word type, undiagnosed) —
those are the remaining Math work if we want it. Next course: Chess (2,248
levels) or a language; switch via the API, not the web UI.

## Open
- [ ] Piecewise construction: place the endpoint from the stated definition
- [ ] Revisit known-bad levels: 150 L4, 153 L4, 160 L3, 148 L3
- [ ] Dot plots and spinner wedges still need real OS mouse input
- [ ] Math runs to unit 411; ~200 units remain

## How to run it cheaply
Unattended now: the scripts/ extension re-injects on every page load, so no
session polls at all (2026-09-02). Check scripts/state.json instead.
The old note: the polling loop needs no reasoning — `duo.js` solves in the page. Run it in its
own small session on a cheap model, and only bring a stronger model in when a
question type has no solver. A long session re-sends its whole history on every
30-second poll, which is the expensive way to watch a status line.

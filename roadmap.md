# Roadmap

## Where the run stopped
Unit 202 level 3, "construct a piecewise graph" (piecewise drag). One draggable
point at (1, -2) belongs at (1, 1) per the definition `f(x) = 2x-1 for x<1, 1
for x>=1`. No solver yet for building a piecewise graph — `curvePieces()` reads
branches but nothing places the open/closed endpoint. Skipped on 2026-09-02 after
3 failed tries.

## Open
- [ ] Piecewise construction: place the endpoint from the stated definition
- [ ] Revisit known-bad levels: 150 L4, 153 L4, 160 L3, 148 L3
- [ ] Dot plots and spinner wedges still need real OS mouse input
- [x] Ledger exported: boot.js POSTs it to serve.py -> scripts/state.json (2026-09-02)
- [ ] Math runs to unit 411; ~200 units remain

## How to run it cheaply
Unattended now: the scripts/ extension re-injects on every page load, so no
session polls at all (2026-09-02). Check scripts/state.json instead.
The old note: the polling loop needs no reasoning — `duo.js` solves in the page. Run it in its
own small session on a cheap model, and only bring a stronger model in when a
question type has no solver. A long session re-sends its whole history on every
30-second poll, which is the expensive way to watch a status line.

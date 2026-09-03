# Roadmap

## Where the run stopped
2026-09-03 ~07:10 PDT: stopped by Joshua at unit 378 level 4, XP 199,202 (goal
was 200K). Overnight run 204 -> 378 with the overhauled solver. Recurring skip:
one "needdrag" level per unit in the 33x range (drag-a-word fill-in) — not yet
diagnosed. To resume: navigate to /lesson/unit/378/level/4, inject duo.js +
boot.js with duoAuto {unit:378, level:4, running:true}.

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

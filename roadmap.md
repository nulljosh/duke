# Roadmap

## Where the run stopped
Loop restarted 2026-09-02 at unit 209 level 4 after the previous tab died. Units
202-209 are mostly SKIPPED (23 of 32 levels): see `skipped` in scripts/state.json.

Diagnosed 2026-09-02 (scripts/diag.js records per-question prompt / grader /
pick / verdict; load it after duo.js and read `__duo.DIAG`):
- Grader answers with a comma inside brackets (`[-3,4]`) were split into two
  strings and a distractor got picked. FIXED: interval-safe `answer()` plus a
  grader-first `solveChoices` wrapper at the end of duo.js.
- "Create the piecewise function" (u202l3) is a `shirtPantsInteractive` blob.
  The widget's HTML is IN the blob (`blob.pants.html`) with `INPUT_VARIABLES`
  and `getOutputVariables()` (here `final_c` = a plain global `currentC` in the
  iframe window). Next step: set that global from the definition instead of
  dragging, then CHECK. `mathDiagram.components` was EMPTY on the frame
  `frameEl()` chose, so pick the iframe whose window has `getOutputVariables`.
- The rest of the 2wrong halts were not yet sampled; run diag.js on each
  skipped level and fix by class.

## Stalls (2026-09-02)
Run goes 30-45 min, dies for 20-30 min, resumes with no one touching it. Two
candidates, neither visible from state.json because it only posted per lesson:
- Chrome throttles a hidden/occluded tab's timers to once a minute after 5 min.
  A window covered by other windows counts as hidden on macOS. Day one nobody
  was at the Mac, so the tab stayed visible for 10 h.
- The 12-min watchdog was only checked between autoLesson calls; a call that
  never returned hung the loop until something else nudged the page.
boot.js now posts a heartbeat every minute to scripts/hb.json (visibility,
seconds inside the current autoLesson call, last result) and cuts S.running at
12 min. Takes effect on the next reload/re-inject. Read hb.json after the next
stall: `visible: hidden` = throttling, `callAge` climbing = a hung solver.
Throttling fix that needs no code: chrome://flags/#intensive-wake-up-throttling
-> Disabled, relaunch.

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

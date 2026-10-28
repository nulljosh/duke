# Duke loop handoff (2026-10-26, overnight)

## What the loop is
`/loop until fez and Duolingo beat`. Duke plays FEZ for real, front to back, while the Duolingo runner keeps grinding courses. Each tick picks the next FEZ target, plays it, commits what worked, logs it in `games/fez/README.md`, and checks the runner is still up. Replies to Joshua stay one line.

Rules for every tick:
- FEZ plays slot 3 (`SaveSlot2`) only. Never touch his slots. Backups are in `games/fez/.save-backup/`.
- No console cheats. FEZUG is for reading state, the HUD and timescale 1.5, nothing else.
- Keep FEZ hidden in the background at low volume. Never launch GUI apps on his screen.
- Never kill the Duolingo runner or the menu bar app. After an `app/App/` edit, deploy the way `CLAUDE.md` says (swap, lsregister, kickstart) so no crash dialog appears.
- Commit and push each win. Stage only the files the tick changed.

## Where things stand
- Runner: restarted with cs as its start track. Balance mode moves between tracks by XP rate (about 785k XP at 00:29 PDT). Its headless browser launches with `--mute-audio`, so lessons no longer read aloud on the Mac.
- FEZ: 32 of 32 (18 gold, 14 anti), 05:45. Cube 31 was the Observatory gold cube (`observatory.cube()`, in from the top via `zu_city_ruins.to_y28()` and Zu Bridge > Throne); cube 32 the Telescope anti-cube (`telescope_cube.cube()`, one-way platforms up to the tube top). BEATEN about 07:00: back down the Tree (`tree_bounce.from_top()`, `tree_roots.down()`), Zu City STARGATE, then the low-gravity Pyramid climb to the Mother Cube (`routes/pyramid.py`, `plan.LOWREACH`); credits rolled, save backed up as `.save-backup/SaveSlot2.beaten`. Joshua 2026-10-26: now max the game out (all 32 gold, 32 anti, the heart cubes); `fezsave.py` lists what's left per room.
- Code anti-cubes are the fast path: `codes.py ROOM...` walks to each room, steps off the door (an Up in the code walks him back out), waits until the game lists Gomez in the code volume (`volumes` in the bridge state; the game tests it from the camera, a 3D box check is not enough), enters the CodePattern from the level data, collects. Joshua's call: like a walkthrough, fine.
- Below the Tree: Boiler Room is left (its route dies at Big Tower). Above the Tree climb: the Tree's own anti-cube floating at (44,60,4) (code solved long ago, cube never taken), Tree Sky, Zu Bridge, Telescope (volume 4's code only), Code Machine. The planner cannot climb the Tree from y53 at all; that climb is the last wall. The 32-cube door is Zu City's STARGATE door (Right view, y36).
- Fixed tonight: the key server followed a dead pid after restarts (the "crash" loop Joshua saw); the bridge mod keeps FEZ active so background keys never go dead; `start()` kills FEZ and restores the save if a menu slip opens a new game (happened once, restored from SaveSlot2_Backup); `fez.snapshot()` copies the save to `.save-backup/` after every cube; restarts capped at one per run.
- Hand routes: `routes/tree_roots.py` (up to the Tree door via the plank ring), `routes/zu_city.py` (down to Memory Core). Bans from the dead-input window were wiped (copy in `.save-backup/bans.before-cleanup`).
- Done tonight: Mine A bit (mid-air camera turn while falling), Mine Wrap bits 4 and 5 (`bombrun.wrap_chain`, the tower's brick ring cleared face by face), Mine Wrap top floor (`bombrun.wrap_top`), Bomb Pillar door and bit (`pillar_door`, `pillar_bit`), the Bomb Pillar's brick block (`pillar_bricks`).
- Stuck: Mine Wrap's gold cube (no solid ground between y44 and its y63 to 65 platforms per the live grid) and the Bomb Pillar chest (about 2 tiles above what a ladder jump reaches).
- `trip.py` (split out of `go.py`) has door, travel, collect and sweep; `trip.travel` marks a door blocked only when Gomez reached it and it would not open. Nature Hub black holes re-roll on each level load (`routes/nature_hub.reroll_holes`).
- Duolingo: Indonesian at about 43%, roughly 13 hours left on that course. Every solved question is saved in `courses/<code>.jsonl` (`scripts/courses.py`). Patois now builds its language units from that vocabulary, with Tatoeba sentences only.
- Duke 1.1 shipped (daily goal ring). The Mac app signs with Developer ID now, so rebuilds don't re-prompt.

## Next, in order
1. FEZ is beaten; the New Game+ max-out is parked at 18 gold, 15 anti, 2 bits (Joshua: "you decide", 2026-10-27), and Papers, Please is the active game. To resume FEZ: most of what is left sits behind Memory Core volume 5, a secret passage to Pivot Watertower at x17-18 z24-25 y48 that never registers Gomez (he stands 3 units in front of it); the rest is puzzles (graveyard lightning platforms, the owl statues for Big Owl, Mine Wrap bombs). Big Tower, Tree Roots and the Waterfall now have hand routes in `routes/`. `python3 games/fez/fezsave.py ~/Library/Application\ Support/FEZ/SaveSlot2` lists what's left per room.
2. Rooms behind doors not yet opened: Pivot Watertower, Industrial Superspin, Pivot One/Two/Three, Triple Pivot Cave, the Sewers. `fezmap.py route` throws KeyError for them until a way in exists.
3. Mine Wrap gold cube: find the intended climb. The Steam guides that cover it rate-limit fetches, so try again later.
4. Puzzles still blocked from before: Lighthouse climb, Quantum, CMY, Weightswitch Temple, Fractal, Tree climb.
5. Papers, Please is the next game for Duke once FEZ is done or fully blocked.

## Restart prompt

```
/loop until fez and Duolingo beat
```
Read `games/fez/README.md` (progress log at the bottom) and this file first.

## Papers, Please (active, 2026-10-27)

Running, launched through Steam (`open steam://run/239030`; Steam on the LaCie must be up). play.py pins the window at (390, 50). The real cursor via cliclick; the bot waits while Joshua uses the Mac and takes the game back after 90 s of a still mouse. `python3 games/papers/day.py <next day>` from the night screen plays a whole day; `--title` from the title screen, `--resume` mid-booth. Guards stop the booth on four penalties or the same face three times: Cmd+Q before Sleep and replay. Never sleep on a negative night. Endings so far: ending 2 (whole family dead) twice, on day 7 and day 10; restarted from day 2 on 2026-10-27 at 23:20. State 2026-10-28 09:30: days 1 to 9 beaten (progress.jsonl), day 10 replaying, all four alive, wife sick. Run day.py detached (`nohup python3 day.py N > log 2>&1 &` plus a pid waiter): Claude Code's low-memory reaper killed a plain background run once. Each citation's reason is printed in runs/dayN-*.log ("citation [...]"); the entrant line above it is the one at fault. Still unchecked: photo and sex mismatches. Auto-handled now: detain an entrant who won't leave, park Drex's cipher, late passports, a passport under the permit. Night plan: medicine for the very sick, food, medicine for the sick, heat; it reads prices off the screen and a brightened second pass catches dim rows. Scripted entrants that stall the bot (Calensk's envelope, Corman Drex's EZIC note: give it, open it, give it back, keep the cipher; the MOI woman wants an envelope) are in RULES.md. Each citation becomes a rules.py test. Target ending 20.

GitHub Actions on nulljosh/duke stopped starting jobs on 2026-10-26 ("recent account payments have failed or your spending limit needs to be increased"). Tests and the docs check pass locally (68/68). It is a billing fix on Joshua's side, not code.

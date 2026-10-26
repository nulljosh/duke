# Surf loop handoff (2026-10-26, overnight)

## What the loop is
`/loop until fez and Duolingo beat`. Surf plays FEZ for real, front to back, while the Duolingo runner keeps grinding courses. Each tick picks the next FEZ target, plays it, commits what worked, logs it in `games/fez/README.md`, and checks the runner is still up. Replies to Joshua stay one line.

Rules for every tick:
- FEZ plays slot 3 (`SaveSlot2`) only. Never touch his slots. Backups are in `games/fez/.save-backup/`.
- No console cheats. FEZUG is for reading state, the HUD and timescale 1.5, nothing else.
- Keep FEZ hidden in the background at low volume. Never launch GUI apps on his screen.
- Never kill the Duolingo runner or the menu bar app. After an `app/App/` edit, deploy the way `CLAUDE.md` says (swap, lsregister, kickstart) so no crash dialog appears.
- Commit and push each win. Stage only the files the tick changed.

## Where things stand
- Runner: restarted with cs as its start track. Balance mode moves between tracks by XP rate (about 785k XP at 00:29 PDT). Its headless browser launches with `--mute-audio`, so lessons no longer read aloud on the Mac.
- FEZ (02:10): 24 of 32 (17 gold, 7 anti). Tonight added the Nuzu Abandoned A bit, the Zu City bit (gold 17) and the sewer QR anti-cube in Zu House Empty.
- Code anti-cubes are the fast path: `codes.py ROOM...` walks to each room, steps off the door (an Up in the code walks him back out), waits until the game lists Gomez in the code volume (`volumes` in the bridge state; the game tests it from the camera, a 3D box check is not enough), enters the CodePattern from the level data, collects. Joshua's call: like a walkthrough, fine.
- Below the Tree: Zu Code Loop, Lighthouse, Nuzu School, Boiler Room (to 28). Above the Tree climb: the Tree's own anti-cube floating at (44,60,4) (code solved long ago, cube never taken), Tree Sky, Zu Bridge, Telescope (volume 4's code only), Code Machine. The planner cannot climb the Tree from y53 at all; that climb is the last wall. The 32-cube door is Zu City's STARGATE door (Right view, y36).
- Fixed tonight: the key server followed a dead pid after restarts (the "crash" loop Joshua saw); the bridge mod keeps FEZ active so background keys never go dead; `start()` kills FEZ and restores the save if a menu slip opens a new game (happened once, restored from SaveSlot2_Backup); `fez.snapshot()` copies the save to `.save-backup/` after every cube; restarts capped at one per run.
- Hand routes: `routes/tree_roots.py` (up to the Tree door via the plank ring), `routes/zu_city.py` (down to Memory Core). Bans from the dead-input window were wiped (copy in `.save-backup/bans.before-cleanup`).
- Done tonight: Mine A bit (mid-air camera turn while falling), Mine Wrap bits 4 and 5 (`bombrun.wrap_chain`, the tower's brick ring cleared face by face), Mine Wrap top floor (`bombrun.wrap_top`), Bomb Pillar door and bit (`pillar_door`, `pillar_bit`), the Bomb Pillar's brick block (`pillar_bricks`).
- Stuck: Mine Wrap's gold cube (no solid ground between y44 and its y63 to 65 platforms per the live grid) and the Bomb Pillar chest (about 2 tiles above what a ladder jump reaches).
- `go.travel` marks a door blocked only when Gomez reached it and it would not open.
- Duolingo: Indonesian at about 43%, roughly 13 hours left on that course. Every solved question is saved in `courses/<code>.jsonl` (`scripts/courses.py`). Patois now builds its language units from that vocabulary, with Tatoeba sentences only.
- Surf 1.1 shipped (daily goal ring). The Mac app signs with Developer ID now, so rebuilds don't re-prompt.

## Next, in order
1. The 4 code rooms below the Tree, then crack the Tree climb (y53 to the Tree Sky door at y99) for the other 5, then walk to Zu City's STARGATE door. `python3 games/fez/fezsave.py ~/Library/Application\ Support/FEZ/SaveSlot2` lists what's left per room.
2. Rooms behind doors not yet opened: Pivot Watertower, Industrial Superspin, Pivot One/Two/Three, Triple Pivot Cave, the Sewers. `fezmap.py route` throws KeyError for them until a way in exists.
3. Mine Wrap gold cube: find the intended climb. The Steam guides that cover it rate-limit fetches, so try again later.
4. Puzzles still blocked from before: Lighthouse climb, Quantum, CMY, Weightswitch Temple, Fractal, Tree climb.
5. Papers, Please is the next game for Surf once FEZ is done or fully blocked.

## Restart prompt

```
/loop until fez and Duolingo beat
```
Read `games/fez/README.md` (progress log at the bottom) and this file first.

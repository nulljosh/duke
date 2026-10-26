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
- FEZ: cubes 22 of 32, bits 6 of 8 toward cube 23. Gomez is in Industrial City, on his way to Nuzu Abandoned A (1 bit).
- Done tonight: Mine A bit (mid-air camera turn while falling), Mine Wrap bits 4 and 5 (`bombrun.wrap_chain`, the tower's brick ring cleared face by face), Mine Wrap top floor (`bombrun.wrap_top`), Bomb Pillar door and bit (`pillar_door`, `pillar_bit`), the Bomb Pillar's brick block (`pillar_bricks`).
- Stuck: Mine Wrap's gold cube (no solid ground between y44 and its y63 to 65 platforms per the live grid) and the Bomb Pillar chest (about 2 tiles above what a ladder jump reaches).
- FEZ sometimes stops taking movement keys while the console still works. `fez.revive()` checks and restarts; `go.travel` calls it. Progress since the last door is lost on restart.
- `go.travel` marks a door blocked when it can't get through. Check `games/fez/blocked.txt` after dead-input runs and remove false entries.
- Duolingo: Indonesian at about 43%, roughly 13 hours left on that course. Every solved question is saved in `courses/<code>.jsonl` (`scripts/courses.py`). Patois now builds its language units from that vocabulary, with Tatoeba sentences only.
- Surf 1.1 shipped (daily goal ring). The Mac app signs with Developer ID now, so rebuilds don't re-prompt.

## Next, in order
1. Nuzu Abandoned A bit, then the other reachable bits. `python3 games/fez/fezsave.py ~/Library/Application\ Support/FEZ/SaveSlot2` lists what's left per room.
2. Rooms behind doors not yet opened: Pivot Watertower, Industrial Superspin, Pivot One/Two/Three, Triple Pivot Cave, the Sewers. `fezmap.py route` throws KeyError for them until a way in exists.
3. Mine Wrap gold cube: find the intended climb. The Steam guides that cover it rate-limit fetches, so try again later.
4. Puzzles still blocked from before: Lighthouse climb, Quantum, CMY, Weightswitch Temple, Fractal, Tree climb.
5. Papers, Please is the next game for Surf once FEZ is done or fully blocked.

## Restart prompt

```
/loop until fez and Duolingo beat
```
Read `games/fez/README.md` (progress log at the bottom) and this file first.

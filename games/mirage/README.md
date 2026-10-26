Mirage on Duke. The goal is the ending, played for real: the water back on the mesa.

## The game

Mirage is our own desert platformer. It runs inside Joshua Tree, Joshua's from-scratch OS, on the PC build and the Pi. Wren climbs out of the town of Arroyo, through Red Canyon, up the Cholla Caves for the salt gate's key, across the Salt Flats and onto the mesa, where the Dust King sits on the spring. The code, art and story live in the joshuatree repo: `user/mirage_core.h` (the world) and `user/mirage.c` (the drawing).

## How it plays

The game prints its own state on every step: `mirage: at ROOM X Y hp ...` for Wren and `mirage: mobs L X Y HP ...` for everything alive in her room. Duke reads those lines and plays by pressing keys. It never sets a flag, moves Wren or skips a room.

The one assist is step mode. `.` stops the clock and each `n` runs five steps, so a busy Mac can't make Duke miss a jump. It pauses the game. It doesn't play it.

`mirage.py` has two places to play:

```bash
python3 mirage.py host           # the real game logic, compiled and run on the Mac (fast)
python3 mirage.py qemu           # Joshua Tree booted headless with Mirage open; keys over QMP, state on serial
python3 mirage.py host --route   # also print the keys pressed, in the format joshuatree's checks replay
```

The planner walks a route of goals: talk to Pina for the staff, cross the canyon, climb the cave ledges to the key, walk back down, open the gate, then face the Dust King and swing when he's in reach. Between goals it jumps walls, pits and cholla spines, stands and swings at scorpions and bats, and waits instead of jumping onto a scorpion. The rooms come from `mirage_core.h`, so a changed map changes the plan with it.

## Progress log

**2026-10-26.** Beaten on the host in 3,725 steps (about 37 seconds of game time), one hit taken and healed by a prickly pear. That run is now joshuatree's `tools/checks/mirage-route.txt`, and the OS replays it in QEMU and ends in the same state as the host.

Duke plays Oxygen Not Included headless. The Duke Bridge mod (`bridge/`, `dotnet build` installs it into ONI's local mods) serves the colony's state and takes orders on 127.0.0.1:8741: dig, build, link wires, queue recipes, research, print dupes, mop, camera, speed. `oni.py` talks to it and captures the window by id. `play.py` runs a colony from a build plan and saves a screenshot and a row in `progress.jsonl` every cycle.

Launch through Steam (`python3 oni.py launch`), never the binary: the game quits a minute in when the Steam API can't reach Steam. If every game logs `ipcserver GetSteamPath failed`, Steam's `ipcserver` helper outlived a Steam restart. Kill it and the next launch works. ONI's hardened runtime refuses `DYLD_INSERT_LIBRARIES`, so the Papers headless dylib crashes it at launch. The mod sets `runInBackground` instead.

## Colony 1 (2026-10-28, Skewed Asteroid)

Survived 10 cycles with 2 of 3 dupes, lasted to cycle 15, 7 techs (Basic Farming, Power Regulation, Employment, Advanced Research, Plumbing, Improved Oxygen, Sanitation Sciences).

What killed it, so colony 2 doesn't repeat it:
- Wires and pipes placed one at a time join nothing. The machines sat unpowered for two cycles until the `link` op.
- The pool was opened at floor level and drained across the base. Gas pressure went up, the Oxygen Diffuser stopped at max pressure, and CO2 filled the bedroom.
- Bulk digs at priority 9 (225 cells) took all the labor. Lindsay got trapped in a water pit one of them opened (cycle 9). Nobody cooked, and Nisbet, Otto and Stinky starved (cycles 12 to 15).
- Food is the clock: 16,000 kcal is about 5 cycles for 3 dupes. The Mush Bar chain (pump, bottle, deliver dirt and water, cook, crank power) has to be running by cycle 3, with Mealwood planted as soon as Basic Farming lands.

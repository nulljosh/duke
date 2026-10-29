Duke plays Oxygen Not Included headless and for real: no debug tools, nothing built before it's researched.

- `bridge/`: the Duke Bridge mod. `dotnet build` installs it into ONI's local mods. It serves the colony on 127.0.0.1:8741 and takes orders such as dig, build, link, research, print, priority, deconstruct, camera and a HUD toggle.
- `oni.py`: talks to the bridge and launches, restarts or starts a new game.
- `play.py`: runs a colony from a build plan. Each cycle it saves a screenshot and a row in `progress.jsonl`.
- `preflight.py`: checks the plan's pumps against the game's rule before a new colony unpauses.
- `graph.py`: colonies side by side, with dupes and food by cycle.
- `wallpaper.py`: the live base as an iPhone wallpaper, written to the top of iCloud Drive.

The game rules the bot relies on, and what killed each colony, are in [GUIDE.md](GUIDE.md). How the base game is won is in [VICTORY.md](VICTORY.md).

## Running it

- Launch through Steam (`python3 oni.py launch`), never the binary, because the game quits when the Steam API can't reach Steam. If every launch logs `ipcserver GetSteamPath failed`, kill Steam's leftover `ipcserver` and try again.
- ONI's hardened runtime refuses `DYLD_INSERT_LIBRARIES`, so the mod sets `runInBackground` instead of using the Papers headless dylib.
- A new game: `python3 oni.py newgame`, then `python3 preflight.py` while it's paused, then `python3 play.py 250`.
- The intro alert sometimes stays up after a new game. Reloading the first autosave clears it (`python3 oni.py restart`).

## Now

Colony 7 is running on the Skewed Asteroid seed, with the pod at 186,120. It's the first colony whose pump works from day one.

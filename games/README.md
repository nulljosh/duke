# Games

Every game Duke plays, and the queue. Duke plays for real: it reads the game's state (a mod, the save, the screen) and presses keys. No cheats, no finished saves.

## Playing

| Game | Folder | Status |
|---|---|---|
| Duolingo (languages, math, chess, music) | `../scripts` | Runs around the clock |
| Factorio | `factorio/` | Beaten |
| Game Dev Tycoon | `gdt/` | Playing in slot 5 |
| FEZ | `fez/` | Beaten 2026-10-26 (32 of 32 cubes, Star Gate ending). New Game+ max-out parked at 18 gold, 15 anti, 2 bits |
| Papers, Please | `papers/` | Days 1 to 9 beaten, parked at day 10 |
| Oxygen Not Included | `oni/` | Parked at colony 7, cycle 24; the win is Home Sweet Home ([VICTORY.md](oni/VICTORY.md)) |
| Pokemon Sapphire | `pokemon/` | Playing as Stitch with Treecko; headless libmgba player, stream to Twitch pending |
| Mirage (Joshua Tree's platformer) | `mirage/` | Played by the Joshua Tree loop |

## Queue

Ranked for Duke from the Steam library (142 games, 2026-10-26): Mac native, readable state, turn-based or pausable, and a real ending. Papers, Please and Oxygen Not Included have moved up to Playing.

1. Stardew Valley. SMAPI mods on Mac give full state; the goal is the Community Center.
2. FTL: Faster Than Light. Pausable, an hour a run; the goal is the Flagship.
3. Plague Inc: Evolved. One decision screen, short games.
4. Undertale. A short pacifist route; the bullet hell is the hard part.
5. Civilization V. Turn-based and long.
6. Terraria. tModLoader on Mac; the Moon Lord ends it.
7. Cities: Skylines. A sandbox, milestones only.
8. Don't Starve. Survival; Adventure Mode is the goal.

Emulator games, on the same headless libmgba player as Sapphire (`pokemon/gba.c`, which already has the GB core). Each needs Joshua's own ROM. Games with a public decompilation come first, because the memory map is read from source instead of guessed:

1. Pokemon Emerald (pret/pokeemerald). The same engine as Sapphire, so most of `pokemon/` carries over.
2. Pokemon FireRed (pret/pokefirered). Same generation, Kanto map.
3. Fire Emblem: The Sacred Stones (FireEmblemUniverse/fireemblem8u). Turn-based, so it plays perfectly.
4. Pokemon Crystal and Red (pret/pokecrystal, pokered). Game Boy disassemblies.
5. Zelda: The Minish Cap (zeldaret/tmc). A work-in-progress decomp, and real-time combat makes it harder.

Later or never: reflex platformers (Super Meat Boy, Cuphead, Hotline Miami, Geometry Dash, Super Hexagon), story walks (Firewatch, Gone Home, The Stanley Parable), multiplayer (Rust, Dota 2, Don't Starve Together), and the 47 games with no Mac build.

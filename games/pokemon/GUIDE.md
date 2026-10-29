# Pokemon Sapphire: the rules the bot plays by

Everything here was read from pret/pokeruby, the game's decompiled source (file names given), or measured in RAM. Read it before pressing anything that can't be undone.

## Menus that don't default the way you'd think

- **Starter bag** (`starter_choose.c`): the cursor starts on Torchic (`tStarterSelection = 1`), with Treecko on the left. Pressing A through Birch's lines picks Torchic, which happened once and was reloaded. Wait for `Task_StarterChoose2`, press LEFT, then A, then YES.
- **Wall clock** (`wallclock.c`, `Task_SetClock3`): "Is this the correct time?" starts on NO (`InitMenu(..., 1, ...)`). Press UP, then A.
- **Naming** (`main_menu.c`, `Task_NewGameSpeech22`): NEW NAME pre-fills a preset name before the keyboard opens. Press B eight times to clear it. The English upper page is `ABCDEF.` / `GHIJKL,` / `MNOPQRS` / `TUVWXYZ` (`naming_screen.c`), the cursor starts on A, and START jumps to OK.
- Gender starts on BOY, and Birch's name menu starts on NEW NAME.

## Reading the game

| What | Where |
|---|---|
| Screen | `gMain.callback2` at 0x03001774 (`CB2_Overworld`, `BattleMainCB2`) |
| Running tasks | `gTasks` at 0x03004B20, 16 x 40 bytes, function pointer first |
| Cutscene running | `sLockFieldControls` at 0x030006A4 (`script.c`) |
| Position and map | `gSaveBlock1` at 0x02025734: x, y, mapGroup, mapNum |
| Collision | `gBackupMapLayout` at 0x03004870. Each block is metatile 0x3FF, collision 0xC00, elevation 0xF000, with a 7-tile border |
| Warps and signs | `gMapHeader.events` at 0x0202E82C |
| Party | `gPlayerParty` at 0x03004360, encrypted (`mons.py`) |
| Money, badges | `gSaveBlock1` +0x490, and flags +0x1220 (badges are flags 0x807 to 0x80E) |
| Name, play time, Pokedex | `gSaveBlock2` at 0x02024EA4: name +0, gender +8, hours +0x0E, owned +0x28 |

- `sMessageBoxMode` drops to hidden once a line finishes printing while the box still waits for A, so `talk()` presses A on every pass until the lock drops.
- The player accepts one client at a time. A second script hangs until the first one exits.

# Duke loop handoff (2026-10-29, morning)

## What the loop is
`/loop until Pikmin 2 is completed, documenting progress with graphs and the iPhone wallpaper` (Sapphire is parked). Duke plays Sapphire for real as Stitch (boy) with Treecko, headless, while the Duolingo runner keeps going. Each tick runs the next leg in `games/pokemon/play.py`, logs a row with `stats.py`, redraws `progress.png` and the iPhone wallpaper, commits, and sends Joshua screenshots. Replies stay one line.

Rules for every tick:
- Read the decomp (pret/pokeruby, symbols in `/Volumes/LaCie/src/pokeruby/`) before any menu or move that can't be undone. `games/pokemon/GUIDE.md` lists the menus that don't default the way you'd expect.
- No cheats. A savestate reload is only for undoing the bot's own misinput.
- Only one client talks to the player at a time, so never run two scripts at once.
- Never kill the Duolingo runner or the menu bar app.

## Where things stand
- The player is `games/pokemon/run.sh`: libmgba with no window on 127.0.0.1:8742, running at 6x. The ROM is at `~/roms/sapphire/`, with backups of the battery save in `backup/`.
- The run: 1 badge (Roxanne). Brawly won once, so Grovyle (L27) is training in Granite Cave for Leaf Blade at L29 (`play.py brawly 29`), then the rematch.
- What the bot can do now: route anywhere over the ROM's map graph, fight by type chart, learn moves without losing attacks, run and heal before it blacks out, ride Briney's boat.
- Sapphire's legendaries are Kyogre, Rayquaza, the three Regis and Latios. Groudon needs a trade from Ruby, and Latias needs the Eon Ticket.
- Pikmin 2 is set up (`games/pikmin/`: a DSU virtual pad and the Dolphin profile on the LaCie). It waits on Joshua clearing Dolphin's first-launch check.

## Next, in order
1. Pikmin 2 Day 2: Day 1 is beaten and saved (bag crushed, Courage Reactor carried by 20, 280 Poko; save backed up
   at games/pikmin/states/day1-end.gci). Relaunch at 3x turbo (dolphin.py SPEED), answer "Land in this area?" with
   Yes, then one autonomous script per day (games/pikmin/GUIDE.md, "Beating the human time"). Day 1 has no sun
   meter; it ends when the reactor lands. sprouts() misreads some sprouts and A with Pikmin in hand throws, so
   pluck with an empty squad. The Y captain swap can miss, so check which captain moves before trusting ACTIVE.
2. Joshua's game queue after Pikmin: Wind Waker, then Smash Bros, then something else. He supplies the files.
   Side idea from him: a Monopoly sim, a million games, to find the best strategy.
   Research (2026-10-29): Melee is fully decompiled (doldecomp/melee) and SmashBot and libmelee already read its
   memory. Wind Waker's decomp (zeldaret/tww) is about 80% done, and its route is on zeldaspeedruns.com. Pikmin 1
   is fully decompiled (projectPiki/pikmin), making it the closest next Pikmin. Twilight Princess and Animal
   Crossing are also fully decompiled. Pikmin 3 and 4 and Hey! Pikmin have no decomp.
3. Sapphire stays parked: Brawly next, then Slateport, Mauville and Wattson.

## Restart prompt

```
/loop until Pikmin 2 is completed, documenting progress with graphs and the iPhone wallpaper
```
Read `games/pikmin/GUIDE.md` and this file first.

## Pikmin 2 (active since 2026-10-29 06:20; Sapphire parked for it)
Loop: `/loop until Pikmin 2 is completed, documenting progress with graphs and the iPhone wallpaper`. The ROM is Joshua's Pikmin 2 (Europe, GPVP01) RVZ at `/Volumes/LaCie/roms/pikmin2/`. Dolphin runs from an isolated profile at `/Volumes/LaCie/dolphin-duke` (quarantine cleared 2026-10-29 with Joshua's OK).
- Live tree: `/Volumes/LaCie/src/duke` (a clone), because macOS revoked Documents access on 2026-10-29 07:00. Use git with `GIT_CONFIG_GLOBAL=/dev/null` (the global gitconfig lives in Documents). When access returns, discard the uncommitted Pikmin edits in the Documents copy and pull.
- Order: `dsu.py` (virtual pad), `memd.py` (MemoryWatcher to `mem.json`), `gdbd.py` (Dolphin's GDB stub on a unix socket, reads any address on tcp 26762), then `dolphin.py launch`, which hides the window. Dolphin blocks at boot until gdbd connects.
- `pk2.py`: `Pad()`, `shot(name)` (Dolphin's screenshot hotkey on the pad's SHARE, works hidden), `mem()`, `read/u32/f32s` (live memory), `control(pad)` (A through dialogue until the stick moves Olimar).
- Twitch (twitch.tv/nulljosh1, live since 2026-10-29 07:32): `games/pikmin/stream.sh` pipes `wincap` (ScreenCaptureKit, Dolphin must be unhidden, behind other windows is fine) into ffmpeg to RTMP. Key in `/Volumes/LaCie/dolphin-duke/twitch.key` (600), read from his dashboard with his OK; never print it.
- `pk2.py` also has `enemies()`, `pellets(kind)` (6 treasures on Day 1), `pikis()`, `waypoints()`/`route()`/`travel()` (the area's carry graph), `throw_at()`, `gather()`. Walking: mFaceDir = camera yaw - stick angle (`Walker`). gather/travel still misroute; fix next.
- Day 1: five red Pikmin join after the Dwarf Bulborb tutorial; B whistles.
- Next: `goto(x, z)` closed-loop on Olimar's position, read enemy and treasure positions from memory, throw, carry the first treasure, and save at the day's end. Then progress.jsonl, graph.py and wallpaper.py, as in pokemon/.
- The memory card in the profile has File 1. Don't touch other slots.

## Pokemon Sapphire (parked 2026-10-29 06:20)
Saved in game at Granite Cave, Grovyle L28 with 1 badge, and the save is backed up. To resume: `games/pokemon/run.sh`, load `states/parked.ss`, then `play.py brawly 29`.

## FEZ (beaten 2026-10-26, max-out parked)
32 of 32 cubes, Star Gate ending. The New Game+ max-out is parked at 18 gold, 15 anti, 2 bits. `python3 games/fez/fezsave.py ~/Library/Application\ Support/FEZ/SaveSlot2` lists what is left; the hard parts are behind Memory Core volume 5 and in the puzzles noted in `games/fez/README.md`.

## Papers, Please (parked, days 1 to 9 beaten)
`python3 games/papers/day.py <day>` plays a day headless (it needs `games/papers/headless.dylib`; see `games/papers/README.md`). Run it detached with nohup. Day 10 is next, with all four family members alive and the wife sick. The target is ending 20, and RULES.md lists the scripted entrants.

## Oxygen Not Included (parked at colony 7, cycle 24)
The win is Home Sweet Home (`games/oni/VICTORY.md`). The colony is on the edge: no water, and the stage 2 pump is placed but not built. To resume, run `python3 games/oni/oni.py launch`, then `restart`, then `nohup python3 -u games/oni/play.py 250 &`. Only one play.py at a time. Next is the Water Sieve. The rules, all read from the game code, are in `games/oni/GUIDE.md`.

## CI
GitHub Actions has been stopped since 2026-10-26 by an account billing limit, which is Joshua's fix. Tests pass locally.

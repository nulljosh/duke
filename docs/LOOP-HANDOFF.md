# Duke loop handoff (2026-10-29, late morning)

## What the loop is
Pikmin 2 is the active loop. Duke plays it for real on Dolphin (headless, with a virtual GameCube pad), one in-game day per autonomous script, saving and backing up the game at each day's end. Sapphire is parked. The Duolingo runner keeps going on its own track and is never touched.

Rules for every tick:
- No cheats and no finished saves. A savestate reload is only for undoing the bot's own misinput.
- Read `games/pikmin/GUIDE.md` and `games/pikmin/PLAYBOOK.md` before any move that can't be undone.
- Only one client talks to Dolphin at a time, so never run two scripts at once.
- Never kill the Duolingo runner or the menu bar app.
- Taper: Joshua wants the loop to stop around 85% weekly usage, after the game is saved and `/save` has run. Weekly usage was 80% at this handoff.

## Where things stand
- Pikmin 2 (Joshua's GPVP01, Europe) runs in Dolphin from the isolated profile at `/Volumes/LaCie/dolphin-duke`. The ROM is at `/Volumes/LaCie/roms/pikmin2/`.
- Day 4 is done. Emergence Cave is cleared: two Candypop Buds made ten purple Pikmin, which lifted the Spherical Atlas (weight 101) home. The Citrus Lump and Quenching Emblem are home too.
- Progress: 4 of 201 treasures, 770 of 10,000 Poko.
- The game is paused at the start of Day 5. Awakening Wood is open.
- Day 4 is saved and backed up to `games/pikmin/states/day4-end.gci` (day 1 to 3 backups sit beside it).
- The plan is in `games/pikmin/PLAYBOOK.md` (the route) and `games/pikmin/ROADMAP.md` (19 milestones and a Monte Carlo finish forecast from `forecast.py`). The P50 is about 143 more bot hours.
- Live tree: `/Volumes/LaCie/src/duke`. The copy in `~/Documents/Code/duke` is behind and holds another session's uncommitted edits. Do not touch, commit or pull it. Commit in the LaCie tree with `git -c user.name=nulljosh -c user.email=trommatic@icloud.com commit`, stage exact paths, and push with `git -c credential.helper='!gh auth git-credential' push`.
- Sapphire's legendaries are Kyogre, Rayquaza, the three Regis and Latios. Groudon needs a trade from Ruby, and Latias needs the Eon Ticket.

## Next, in order
1. Pikmin 2 Day 5, Awakening Wood. Then Hole of Beasts and White Flower Garden, following `games/pikmin/PLAYBOOK.md`.
2. At every day's end: save, back up to `games/pikmin/states/dayN-end.gci`, and refresh the progress graph and the iPhone wallpaper.
3. Joshua's game queue after Pikmin: Wind Waker, then Smash Bros, then something else. He supplies the files. Side idea from him: a Monopoly sim, a million games, to find the best strategy.
   Research (2026-10-29): Melee is fully decompiled (doldecomp/melee), and SmashBot and libmelee already read its memory. Wind Waker's decomp (zeldaret/tww) is about 80% done, and its route is on zeldaspeedruns.com. Pikmin 1 is fully decompiled (projectPiki/pikmin), making it the closest next Pikmin. Twilight Princess and Animal Crossing are also fully decompiled. Pikmin 3 and 4 and Hey! Pikmin have no decomp.
4. Sapphire stays parked: Brawly next, then Slateport, Mauville and Wattson.

## Restart prompt

```
/loop pikmin 2 until game done or we hit 90% usage weekly
```
Read `games/pikmin/GUIDE.md`, `games/pikmin/PLAYBOOK.md` and this file first. Taper to a stop near 85% weekly usage, after the save is written and `/save` has run.

## Pikmin 2 (active since 2026-10-29 06:20; Sapphire parked for it)
- Order: `dsu.py` (virtual pad), `memd.py` (MemoryWatcher to `mem.json`), `gdbd.py` (Dolphin's GDB stub on a unix socket, reads any address on tcp 26762), then `dolphin.py launch`, which hides the window. Dolphin blocks at boot until gdbd connects. Relaunch at 3x turbo (`dolphin.py SPEED`).
- `pk2.py`: `Pad()`, `shot(name)` (Dolphin's screenshot hotkey on the pad's SHARE, works hidden), `mem()`, `read/u32/f32s` (live memory), `control(pad)` (A through dialogue until the stick moves Olimar), `enemies()`, `pellets(kind)`, `pikis()`, `waypoints()`/`route()`/`travel()` (the area's carry graph), `throw_at()`, `gather()`.
- Walking: mFaceDir = camera yaw minus stick angle (`Walker`).
- Known rough edges: `sprouts()` misreads some sprouts, and A with Pikmin in hand throws, so pluck with an empty squad. The Y captain swap can miss, so check which captain moves before trusting ACTIVE.
- Twitch: `games/pikmin/stream.sh` pipes `wincap` (ScreenCaptureKit; Dolphin must be unhidden, behind other windows is fine) into ffmpeg to RTMP for twitch.tv/nulljosh1. The key is in `/Volumes/LaCie/dolphin-duke/twitch.key` (mode 600), read from his dashboard with his OK. Never print it.
- The memory card in the profile has File 1. Don't touch other slots.

## Pokemon Sapphire (parked 2026-10-29 06:20)
Saved in game at Granite Cave, Grovyle L28 with 1 badge, and the save is backed up. To resume: `games/pokemon/run.sh`, load `states/parked.ss`, then `play.py brawly 29`. The player is `run.sh`: libmgba with no window on 127.0.0.1:8742, running at 6x. The ROM is at `~/roms/sapphire/`. What the bot can do: route over the ROM's map graph, fight by type chart, learn moves without losing attacks, run and heal before it blacks out, ride Briney's boat.

## FEZ (beaten 2026-10-26, max-out parked)
32 of 32 cubes, Star Gate ending. The New Game+ max-out is parked at 18 gold, 15 anti, 2 bits. `python3 games/fez/fezsave.py ~/Library/Application\ Support/FEZ/SaveSlot2` lists what is left; the hard parts are behind Memory Core volume 5 and in the puzzles noted in `games/fez/README.md`.

## Papers, Please (parked, days 1 to 9 beaten)
`python3 games/papers/day.py <day>` plays a day headless (it needs `games/papers/headless.dylib`; see `games/papers/README.md`). Run it detached with nohup. Day 10 is next, with all four family members alive and the wife sick. The target is ending 20, and RULES.md lists the scripted entrants.

## Oxygen Not Included (parked at colony 7, cycle 24)
The win is Home Sweet Home (`games/oni/VICTORY.md`). The colony is on the edge: no water, and the stage 2 pump is placed but not built. To resume, run `python3 games/oni/oni.py launch`, then `restart`, then `nohup python3 -u games/oni/play.py 250 &`. Only one play.py at a time. Next is the Water Sieve. The rules, all read from the game code, are in `games/oni/GUIDE.md`.

## CI
GitHub Actions has been stopped since 2026-10-26 by an account billing limit, which is Joshua's fix. Tests pass locally.

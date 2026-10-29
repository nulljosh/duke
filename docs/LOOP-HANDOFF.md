# Duke loop handoff (2026-10-28, night)

## What the loop is
`/loop until Pokemon Sapphire is complete with all stats maxed out and all legendary Pokemon captured`. Duke plays Sapphire for real as Stitch (boy) with Treecko, headless, while the Duolingo runner keeps going. Each tick runs the next leg in `games/pokemon/play.py`, logs a row with `stats.py`, redraws `progress.png` and the iPhone wallpaper, commits, and sends Joshua screenshots. Replies stay one line.

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
1. Brawly, then Slateport (Briney's boat), Mauville and Wattson.
2. Catch a team: water and flying types for the HMs, and cover for Grovyle's fire and flying weaknesses.
3. Badges 3 to 8, the Elite Four, then the legendaries and stat maxing.

## Restart prompt

```
/loop until Pokemon Sapphire is complete with all stats maxed out and all legendary Pokemon captured
```
Read `games/pokemon/README.md`, `GUIDE.md` and this file first.

## FEZ (beaten 2026-10-26, max-out parked)
32 of 32 cubes, Star Gate ending. The New Game+ max-out is parked at 18 gold, 15 anti, 2 bits. `python3 games/fez/fezsave.py ~/Library/Application\ Support/FEZ/SaveSlot2` lists what is left; the hard parts are behind Memory Core volume 5 and in the puzzles noted in `games/fez/README.md`.

## Papers, Please (parked, days 1 to 9 beaten)
`python3 games/papers/day.py <day>` plays a day headless (it needs `games/papers/headless.dylib`; see `games/papers/README.md`). Run it detached with nohup. Day 10 is next, with all four family members alive and the wife sick. The target is ending 20, and RULES.md lists the scripted entrants.

## Oxygen Not Included (parked at colony 7, cycle 24)
The win is Home Sweet Home (`games/oni/VICTORY.md`). The colony is on the edge: no water, and the stage 2 pump is placed but not built. To resume, run `python3 games/oni/oni.py launch`, then `restart`, then `nohup python3 -u games/oni/play.py 250 &`. Only one play.py at a time. Next is the Water Sieve. The rules, all read from the game code, are in `games/oni/GUIDE.md`.

## CI
GitHub Actions has been stopped since 2026-10-26 by an account billing limit, which is Joshua's fix. Tests pass locally.

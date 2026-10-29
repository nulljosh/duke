# Duke loop handoff (2026-10-28, night)

## What the loop is
`/loop until Pokemon Sapphire is complete with all stats maxed out and all legendary Pokemon captured`. Duke plays Sapphire for real as Stitch (boy) with Treecko, headless, while the Duolingo runner keeps going. Each tick runs the next leg in `games/pokemon/play.py`, logs a row with `stats.py`, redraws `progress.png` and the iPhone wallpaper, commits, and sends Joshua screenshots. Replies stay one line.

Rules for every tick:
- Read the decomp (pret/pokeruby, symbols in `/Volumes/LaCie/src/pokeruby/`) before any menu or move that can't be undone. `games/pokemon/GUIDE.md` lists the menus that don't default the way you'd expect.
- No cheats. A savestate reload is only for undoing the bot's own misinput.
- Only one client talks to the player at a time, so never run two scripts at once.
- Never kill the Duolingo runner or the menu bar app.

## Where things stand
- Player: `games/pokemon/run.sh` (libmgba, no window, 127.0.0.1:8742; frames go to ffmpeg on udp 9000 for OBS). The ROM is at `~/roms/sapphire/`. Twitch waits on Joshua's account and stream key.
- Run: Treecko got the Poochyena win and Birch's rescue at 0:15 play time. Now grinding on Route 101 to L8 (`play.py grind101 8`) before May's Torchic on Route 103. No in-game save written yet.
- Sapphire's legendaries are Kyogre, Rayquaza, Regirock, Regice, Registeel and the roaming Latios. Groudon is Ruby-only, so it needs a trade, and Latias needs the Eon Ticket event. Say so before claiming "all".

## Next, in order
1. May on Route 103, then Petalburg (meet Dad, Wally), Route 104, Petalburg Woods, Rustboro and Roxanne.
2. Teach `nav.fight` to pick moves by type and to switch or heal; write an in-game save leg (START, SAVE).
3. Badges 2 to 8, the Elite Four, then the legendaries and stat maxing (EV training, Rare Candy only from the game itself).

## Restart prompt

```
/loop until Pokemon Sapphire is complete with all stats maxed out and all legendary Pokemon captured
```
Read `games/pokemon/README.md`, `GUIDE.md` and this file first.

## FEZ (beaten 2026-10-26, max-out parked)
32 of 32 cubes, Star Gate ending. The New Game+ max-out is parked at 18 gold, 15 anti, 2 bits. `python3 games/fez/fezsave.py ~/Library/Application\ Support/FEZ/SaveSlot2` lists what is left; the hard parts are behind Memory Core volume 5 and in the puzzles noted in `games/fez/README.md`.

## Papers, Please (active, 2026-10-27)

Headless since 2026-10-28: with `games/papers/headless.dylib` built (`clang -dynamiclib -fobjc-arc -framework Cocoa -o headless.dylib headless.m`), day.py launches the game in the background with the dylib inserted, play.py sends its clicks over `/tmp/papers-input.sock` and captures the window by id, so it plays behind Joshua's windows and never moves his cursor. Without the dylib it falls back to Steam and the real cursor: play.py pins the window at (390, 50). The real cursor via cliclick; the bot waits while Joshua uses the Mac and takes the game back after 90 s of a still mouse. `python3 games/papers/day.py <next day>` from the night screen plays a whole day; `--title` from the title screen, `--resume` mid-booth. Guards stop the booth on four penalties or the same face three times: Cmd+Q before Sleep and replay. Never sleep on a negative night. Endings so far: ending 2 (whole family dead) twice, on day 7 and day 10; restarted from day 2 on 2026-10-27 at 23:20. State 2026-10-28 09:30: days 1 to 9 beaten (progress.jsonl), day 10 replaying, all four alive, wife sick. Run day.py detached (`nohup python3 day.py N > log 2>&1 &` plus a pid waiter): Claude Code's low-memory reaper killed a plain background run once. Each citation's reason is printed in runs/dayN-*.log ("citation [...]"); the entrant line above it is the one at fault. Still unchecked: photo and sex mismatches. Auto-handled now: detain an entrant who won't leave, park Drex's cipher, late passports, a passport under the permit. Night plan: medicine for the very sick, food, medicine for the sick, heat; it reads prices off the screen and a brightened second pass catches dim rows. Scripted entrants that stall the bot (Calensk's envelope, Corman Drex's EZIC note: give it, open it, give it back, keep the cipher; the MOI woman wants an envelope) are in RULES.md. Each citation becomes a rules.py test. Target ending 20.

GitHub Actions on nulljosh/duke stopped starting jobs on 2026-10-26 ("recent account payments have failed or your spending limit needs to be increased"). Tests and the docs check pass locally (68/68). It is a billing fix on Joshua's side, not code.

## Oxygen Not Included (parked 2026-10-28 20:12)

Goal from Joshua: beat the game (base game only, no DLC owned; Spaced Out is the DLC worth buying, about CDN$14.49). The base game has two wins, read from the game code (`games/oni/VICTORY.md`): Home Sweet Home (cycle 200, 12 dupes, morale, Great Monument with 17.5 t steel) and the Great Escape (a hydrogen rocket with liquid oxygen to the Temporal Tear at 180,000 km). Home Sweet Home has the earliest floor, cycle 200, about 6 hours at 10x; realistic ETA is a few days (Joshua agreed 2026-10-28 and is letting it run). Decompile game types with `/Volumes/LaCie/dotnet-tools/ilspycmd -t <Type> <Managed>/Assembly-CSharp.dll` (DOTNET_ROOT=/Volumes/LaCie/dotnet10) instead of guessing mechanics.

How it runs, and the scripts, are in games/oni/README.md. The rules the bot plays by, all read from the game code, and what killed colonies 1 to 6 are in games/oni/GUIDE.md. Never run two play.py: start it detached, keep its pid in the scratchpad `oni.pid` and kill it by pid. A game restart loses the time since the cycle's autosave, and every bridge rebuild needs one.

Parked at 20:12 for Pokemon, with the game closed. Colony 7 is saved as "The Hapless Beyond", autosave cycle 24, with 4 dupes, 14 techs, 1.4k kcal and 0 water. It is on the edge: pool 1 fell one cell under the first pump. That pump is down, and the stage 2 pump at 190,106 with its ladder at 189 (y106 to 110) is placed but not built. Research is parked on basic-only techs until water passes 3 t.

To resume: `python3 games/oni/oni.py launch`, then load the save (`restart` resumes the latest autosave), then `nohup python3 -u games/oni/play.py 250 &` with its pid in the scratchpad. It goes on with pump stages, the water-gated research and the capped mushers (stop over 30k kcal, start under 20k). Next: the Water Sieve (Distillation is done), which needs an electric pump in a polluted pool and pipes. Take Water care packages. If colony 7 dies, colony 8 runs `preflight.py` first.

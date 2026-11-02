# Duke loop handoff (2026-11-02, overnight)

## What the loop is now
Joshua's ask (2026-11-02): finish every game in games/README.md to 100%, one at a time, overnight, headless and muted, a screenshot to him (SendUserFile) after each day or milestone, replies one line. Order: Papers, Please (days 10 to 31, ending 20), Game Dev Tycoon, FEZ max-out, Oxygen Not Included, Pokemon Sapphire (Groudon needs a Ruby trade, tell him), Pikmin 2. Restart prompt:
```
/loop Finish every game listed in Duke's games/README.md to 100%, one at a time, overnight: Papers, Please first ... Replies one line.
```

## Papers, Please right now
- Headless and muted: `games/papers/headless.dylib` (build line at the top of headless.m; it interposes AudioOutputUnitStart, AudioDeviceStart and AudioQueueStart). `games/fez/win` and `games/fez/ocr` are built binaries (gitignored): rebuild with `swiftc -O -o games/fez/win games/factorio/scripts/win.swift` and `swiftc -O -o games/fez/ocr games/fez/ocr.swift` if a cleanup wipes them.
- Run a day: `nohup python3 -u games/papers/day.py N --replay > /tmp/papers-dN.out &` (relaunches the game headless and opens day N from its morning save). Plain `day.py N` assumes the night screen of day N-1 is up.
- 2026-11-02 12:00: days 11 to 14 logged; day 15 keeps failing (game over twice: family dead after a broke night 15, then debt). Day 15 is running from the title (`day.py 15 --title`), fully automated: `bomb.py` defuses entrant 2's bomb once (`PAPERS_BOMB_DONE=1` to resume after it), `ezic.messenger` hands E7 both grey coded papers and returns his note. Need ~8 paid with <=2 citations for medicine on night 15. If it keeps failing: replay day 14 and skip food on night 14 to bank 15.
- 2026-11-02 12:10: OCR down machine-wide. Vision accurate mode crashes with `e5rtError ... 13`, and play.ocr now exits fast on it. Restarting aned and ANECompilerService and moving ~/Library/Caches/com.apple.e5rt.e5bundlecache aside didn't help. Swap is 10.7 of 12 GB, so a reboot is the fix. After the reboot: `games/fez/ocr /tmp/now.png` should return JSON, then `day.py 15 --title`. Last run, entrant 0 got a false deny from the HIGHLIGHT DISCREPANCIES bar (fixed). The game went to the title about 60 s after "bomb defused", so it probably blew up; check `runs/bomb-open-*` and `runs/bomb-cut-*` next run.
- Never call play.py functions while a bot is only paused (kill -STOP): it holds the game's input socket and your command hangs. Kill it (-9) first.
- Live log: `runs/live.log` (play.py tees there). Outside stall watcher: `python3 stall.py` exits after 6 unchanged minutes.
- Day 15 bomb (E2, by hand, 60 real seconds): drag it from the counter to the desk at (700, 430); click the cover corners, then the four screws at (650, 382) (771, 382) (650, 467) (771, 467); trace each numbered box's pipe to a red wire. This run: box 1 -> x 690, 2 -> 648, 3 -> 774, 4 -> 732 at y 416. Hand the bomb back. A replay of day 15 needs the same by hand (no guard in play.py now).
- Root fixes this session: the cached empty counter was a black fade frame (now `counter-empty.png`, fixed); drop spots lowered so a passport's visa stays on the desk; EZIC grey (42,42,42) papers are never swept to the booth; no passport after the waits means interrogate; scale read off the LCD (`scale.py`); inspect mode lets the game check height, weight and description before approvals (`inspect_mode.py`, deny only on "DISCREPANCY DETECTED"); permit expiry from its own Enter-by row; exact districts. Decide is ~8 s an entrant, ~12 paid a day.
- Tools: `why.py runs/dayN-HHMM.log N` names the rules.py line behind each deny (logs now keep word positions); `runs/desk/` keeps a desk shot per decision; `slept` line at the end of each log totals sleeps by line.
- Still open: wanted criminals (bulletin faces). Correlation can't tell them apart (`wanted.py`, log only); next idea is inspect mode, bulletin photo vs face. Also seals (forged permits), photo vs face, sex. Day 15 E7 EZIC messenger wants both coded papers: `ezic.messenger` parks anything without RETURN TO MESSENGER, so he may stall; hand him the cipher and Drex's paper by hand.
- The EZIC messenger (hood, star on his face) slides a FOLDED note: OCR can't read it folded. Click its top tab to open: "READ QUICKLY, RETURN TO MESSENGER". Hand it back and he leaves. `play.messenger()` now does this, found by face (`ezic-face.png`, diff < 12). Day 20's messenger brings poison: `messenger()` stops the run there on purpose; play him by hand.
- M. Vonel (days 12, 29): hand back only his MOI badge. The bot's blind drags had pulled the cipher and Drex's coded paper onto the desk while he stood there; giving either is ending 3. `entrant()` now returns only the badge when OCR shows VONEL.
- Killing day.py/play.py mid-socket killed the game twice (SIGPIPE). headless.m now ignores SIGPIPE. Still pause with `kill -STOP`, act by hand, then `kill -9`.
- `games/papers/map.py` draws the 31-day route (`map.svg`) from progress.jsonl; redraw after each day.
- Calensk (guard) offers a detain bonus: ignore him (Joshua: "fuck him off").
- Open for day 11 on: forged-seal check on permits and photo check on ID cards (both cost citations on day 11), a desk snapshot per entrant for training those checks. `same entrant` now waits up to 7 times instead of killing the day; DETAIN is clicked whenever it shows.
- Day 10 fixes so far: CONTINUE retried on the day picker, five desk spots instead of three (workers bring a third paper, day 13 on a fourth), 2.5 s wait between slid papers. Day 10 was replaying at handoff.

## Earlier (Pikmin 2 loop, 2026-10-29)
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

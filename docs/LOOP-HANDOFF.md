# Duke loop handoff (2026-11-02, night)

## What the loop is
Joshua's ask (2026-11-02): finish every game in games/README.md to 100%, one at a time, overnight, headless and muted. Send a screenshot to Joshua (SendUserFile) after each day or milestone. Replies are one line.

Order: Papers, Please (days 15 to 31, ending 20), Game Dev Tycoon, FEZ max-out, Oxygen Not Included, Pokemon Sapphire (Groudon needs a Ruby trade, tell Joshua), Pikmin 2.

The loop is stopped. Papers, Please day 15 is waiting on a reboot, because the Mac's built-in text reader (Vision OCR) broke machine-wide.

## Pikmin 2 right now (2026-11-02 night, active)
- Day 5 in Awakening Wood, not saved to the card yet (the card holds Day 5's morning). 5 of 201 treasures, 940 Poko: the Sunseed Berry came home after both Dwarf Bulborbs and the Red Bulborb were killed with no losses.
- Streaming to twitch.tv/nulljosh1 with the game's sound: `stream.sh` tails Dolphin's audio dump (Dolphin.ini [DSP] DumpAudio + DumpAudioSilent, nothing on the speakers). `restart.sh` reloads the save and restarts the stream.
- Always run plans through `steps.py` (savestate checkpoints, automatic rollback on any loss). Rules learned tonight are in `games/pikmin/GUIDE.md`, "Awakening Wood".
- Next: the pot bulb (stuck in its pot), then Hole of Beasts, then end the day with `dayend.py` only when nothing was lost. The Projection needs Whites (White Flower Garden), and the Blue Onion needs Yellows from Perplexing Pool.
- Emulation runs at 1x, not the configured 3x, while the Mac is busy (Unreal tests), so the forecast is optimistic.

## Earlier (Pikmin 2 loop, 2026-10-29)
## Where things stand
- **Papers, Please:** days 1 to 14 are done. Day 15 kept failing: the family died once after a broke night 15, then a debt ended a run, and the bomb went off more than once. Days 11 to 14 went through with the bomb-defuse, EZIC messenger and inspect-mode routines.
- **OCR is down machine-wide.** Vision accurate mode crashes with `e5rtError ... 13`, and `play.ocr` now exits fast on it. Restarting aned and ANECompilerService and moving the e5rt bundle cache aside did not help. Swap was 10.7 of 12 GB, so a reboot is the fix.
- **Pikmin 2 is paused at the start of Day 5** (Awakening Wood). Day 4 is saved and backed up to `games/pikmin/states/day4-end.gci`. Progress: 4 of 201 treasures, 770 of 10,000 Poko.
- **Pokemon Sapphire is parked** in Granite Cave with Grovyle L28 and one badge (`states/parked.ss`). Next is Brawly, then Slateport, Mauville and Wattson.
- **FEZ** is beaten (32 of 32 cubes, Star Gate ending). The New Game+ max-out is parked at 18 gold, 15 anti, 2 bits.
- **Oxygen Not Included** is parked at colony 7, cycle 24, with no water and the stage 2 pump placed but not built.

## Next, in order
1. Reboot the Mac. Check that `games/fez/ocr /tmp/now.png` returns JSON. Then run `python3 games/papers/day.py 15 --title` (detached with nohup, `PAPERS_BOMB_DONE=1` to resume after the bomb). If it keeps failing, replay day 14 and skip food on night 14 to bank 15.
2. Papers, Please days 16 to 31, ending 20. Day 20's messenger brings poison, so `messenger()` stops there on purpose and it gets played by hand. Still open: wanted criminals (bulletin faces), forged seals, and photo vs face checks.
3. Game Dev Tycoon, then FEZ max-out, then Oxygen Not Included (next is the Water Sieve), then Pokemon Sapphire (Brawly next), then Pikmin 2 (Day 5, following `games/pikmin/PLAYBOOK.md`).
4. At every day's end: save, back up the state, send Joshua a screenshot.

## Papers, Please how-to
- **Headless and muted:** `games/papers/headless.dylib` (build line at the top of headless.m). It interposes AudioOutputUnitStart, AudioDeviceStart and AudioQueueStart. `games/fez/win` and `games/fez/ocr` are gitignored binaries. Rebuild with `swiftc -O -o games/fez/win games/factorio/scripts/win.swift` and `swiftc -O -o games/fez/ocr games/fez/ocr.swift` if a cleanup wipes them.
- **Run a day:** `nohup python3 -u games/papers/day.py N --replay > /tmp/papers-dN.out &`. Plain `day.py N` assumes the night screen of day N-1 is up.
- **Never** call play.py functions while a bot is only paused with kill -STOP, because it holds the game's input socket and the command hangs. Kill it with -9 first. Killing day.py or play.py mid-socket used to kill the game (SIGPIPE). headless.m now ignores SIGPIPE.
- **Logs:** `runs/live.log` (play.py tees there). Outside stall watcher: `python3 stall.py` exits after 6 unchanged minutes. `why.py runs/dayN-HHMM.log N` names the rules.py line behind each deny. `runs/desk/` keeps a desk shot per decision. `games/papers/map.py` redraws the 31-day route from progress.jsonl.
- **Day 15 bomb, by hand (about 60 seconds):** drag the bomb from the counter to the desk at (700, 430). Click the cover corners, then the four screws at (650, 382), (771, 382), (650, 467) and (771, 467). Trace each numbered box's pipe to a red wire. Last run: box 1 to x 690, 2 to 648, 3 to 774, 4 to 732, at y 416. Hand the bomb back. A replay of day 15 needs the same by hand.
- **EZIC messenger:** he slides a folded note. Click its top tab to open it, then hand it back and he leaves. `play.messenger()` does this, found by face (`ezic-face.png`, diff under 12). On day 15 he wants both coded papers. `ezic.messenger` parks anything without RETURN TO MESSENGER, so hand him the cipher and Drex's paper by hand if he stalls.
- **M. Vonel (days 12 and 29):** hand back only his MOI badge. Giving the cipher or Drex's coded paper is ending 3. `entrant()` returns only the badge when OCR shows VONEL.
- **Calensk (guard)** offers a detain bonus. Ignore him.
- **Inspect mode** lets the game check height, weight and description before approvals (`inspect_mode.py`, deny only on "DISCREPANCY DETECTED").

## Parked games
- **Pikmin 2** (Joshua's GPVP01, Europe) runs in Dolphin from the isolated profile at `/Volumes/LaCie/dolphin-duke`. The ROM is at `/Volumes/LaCie/roms/pikmin2/`. Order: `dsu.py` (virtual pad), `memd.py` (MemoryWatcher to `mem.json`), `gdbd.py` (Dolphin's GDB stub), then `dolphin.py launch`, which hides the window. Relaunch at 3x turbo with `dolphin.py SPEED`. `pk2.py` has the helpers (`Pad()`, `shot(name)`, `mem()`, `control(pad)`, `route()`, `travel()`, `gather()`). Known rough edges: `sprouts()` misreads some sprouts, and A with Pikmin in hand throws, so pluck with an empty squad. The plan is in `games/pikmin/PLAYBOOK.md` and `games/pikmin/ROADMAP.md` (P50 about 143 more bot hours). The memory card has File 1. Don't touch other slots.
- **Twitch:** `games/pikmin/stream.sh` pipes `wincap` into ffmpeg to RTMP for twitch.tv/nulljosh1. The key lives in `/Volumes/LaCie/dolphin-duke/twitch.key` (mode 600). Read it only with Joshua's OK, and never print it.
- **Pokemon Sapphire:** resume with `games/pokemon/run.sh`, load `states/parked.ss`, then `play.py brawly 29`. libmgba runs with no window on 127.0.0.1:8742 at 6x. The ROM is at `~/roms/sapphire/`. Groudon needs a trade from Ruby, and Latias needs the Eon Ticket.
- **Pikmin source tree note:** the handoff used to point at `/Volumes/LaCie/src/duke` as the live tree and called `~/Documents/Code/duke` behind. Check which tree is live before committing game work there.
- **Joshua's game queue after Pikmin:** Wind Waker, then Smash Bros, then something else. He supplies the files. Research (2026-10-29): Melee is fully decompiled, Wind Waker's decomp is about 80% done, and Pikmin 1 is fully decompiled, so it is the closest next Pikmin.
- **Git:** commit by exact path, and push. Don't commit anything from `games/` that was copied from a Steam install.

## CI
GitHub Actions has been stopped since 2026-10-26 by an account billing limit, which is Joshua's fix. Tests pass locally.

## Restart prompt
```
/loop Finish every game listed in Duke's games/README.md to 100%, one at a time, overnight, headless and muted: Papers, Please first (day 15 after the Mac reboot, through day 31, ending 20), then Game Dev Tycoon, FEZ max-out, Oxygen Not Included, Pokemon Sapphire, Pikmin 2. Send Joshua a screenshot after each day or milestone. Replies one line.
```

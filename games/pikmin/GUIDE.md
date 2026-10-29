# Pikmin 2: the rules the bot plays by

Addresses come from the projectPiki/pikmin2 decomp (`symbols-GPVP01.txt`, PAL) or were found by scanning RAM through
`gdbd.py`. Story facts come from pikminwiki.com. Read this before pressing anything that can't be undone.

## Running it

Start `dsu.py`, `memd.py`, `gdbd.py`, then `python3 dolphin.py launch`. Dolphin waits at boot until gdbd connects.
Dolphin has to stay unhidden for the Twitch capture (`stream.sh`); `launch` hides it after 5 seconds, so unhide it.
`pk2.ACTIVE` picks the captain the stick drives: 0 Olimar, 1 Louie. Y swaps them in the game; set `ACTIVE` to match.

## Reading the game

| What | Where |
|---|---|
| Captains | naviMgr 0x80516660, +0x28 array, 0x320 each; position +0x20C, facing +0x1FC |
| Throw cursor | Navi +0x28C NaviWhistle, position +0x0C |
| Squad size | GameStat formationPikis 0x80512FEC + 0x20 per captain |
| Pikmin in the field | pikiMgr 0x80516674, 0x2C8 each, position +0x20C |
| Sprouts | ItemPikihead::mgr 0x805167F0, MonoObjectMgr at +0x4C, position +0x19C |
| Enemies | GeneralEnemyMgr 0x80516560; id 0 is the Pellet Posy, id 1 the Dwarf Red Bulborb |
| Treasures | 0x805168A0, Pellet position +0x3AC, config +0x35C, config name string at config +0x40 |
| Carry routes | mapMgr 0x80516688 +0x08 GameRouteMgr, 0x78-byte waypoints |

Treasure names from the config: `denchi_1_red` is the Courage Reactor, the Day 1 battery.

## Walking

The stick is camera-relative and the camera turns, so `Walker` re-estimates the camera yaw from Olimar's facing after
every step. Walk straight first. The carry-route graph takes long detours, so use it only when a straight walk sticks.

## Day 1, Valley of Repose

1. Olimar lands alone, finds red Pikmin fighting a Dwarf Red Bulborb, whistles them (B), and kills it.
2. The path west to the Courage Reactor (-1070, 3290) is blocked by a paper bag at about (-880, 2800). The bag needs
   15 Pikmin thrown on top. With 5, the bot kept walking into it.
3. Press Y to swap to Louie. He wakes by the ship at about (-1260, 4350).
4. Walking Louie east along the route finds the Red Onion at about (-340, 4000), with Pellet Posies around it.
5. Pluck sprouts (stand on one, press A). Throw the squad at a posy, and the pellet goes to the Onion as new seeds.
   `farm.py` repeats this until there are 15 Pikmin.
6. Take 15 to the bag and crush it (bag.py, last2.py).
7. The Courage Reactor needs 20 carriers. Day 1 tops out at 16 Pikmin plus 2 seeds from the Bulborb carcass
   (day1b.py), so the reactor waits for Day 2, when the posies are back. endday.py whistles both squads in before sunset.

A Bulborb carcass stops moving when no Onion has been found yet. Pikmin left outside a group or away from an Onion at
sunset are eaten. A day ends at sunset or from the pause menu.

## Beating the human time

A first playthrough with all 201 treasures takes a person about 25 hours. The bot beats that with these, in order of size:

1. **Get me out of the loop.** Most of today went on my own turns: read a screenshot, think, send one move. Each day
   gets one script that runs a queue of tasks (go here, throw there, wait for the carry) from memory reads alone, and
   I check in between days.
2. **Turbo.** `dolphin.SPEED` (3.0) sets Dolphin's emulation speed, and the overlay shows the real speed it holds.
   It takes effect on the next launch, after the Day 1 save. The walking loop is closed-loop on memory, so it keeps up.
3. **Both captains at once.** Carries run themselves, so while one squad carries, the other captain starts the next
   job. People rarely do this well, and a script never forgets the idle squad.
4. **A fixed route.** The fan 8-day treasure order (speeddemosarchive.com/Pikmin2.html) instead of exploring:
   D1 Valley; D2 Valley and Emergence Cave; D3 Awakening Wood, White Flower Garden, Hole of Beasts; then on to the
   Wistful Wild and the last caves.
5. **No wasted frames.** Throw at the fastest rate, swarm with the C-stick, and never stand idle.

The target is under 10 hours of wall clock. That's a goal, not a measurement yet.

## The rest of the game

Emergence Cave gives the Spherical Atlas, which opens Awakening Wood, where Blue Pikmin are. Yellows are in
Perplexing Pool. The debt is 10,000 Poko; cave money only counts once you leave by a geyser. The finish line is all
201 treasures.

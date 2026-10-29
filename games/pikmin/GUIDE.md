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
6. Next: take 15 to the bag, crush it, carry the reactor to the ship.

A Bulborb carcass stops moving when no Onion has been found yet. Pikmin left outside a group or away from an Onion at
sunset are eaten. A day ends at sunset or from the pause menu.

## The rest of the game

Emergence Cave gives the Spherical Atlas, which opens Awakening Wood, where Blue Pikmin are. Yellows are in
Perplexing Pool. The debt is 10,000 Poko; cave money only counts once you leave by a geyser. The finish line is all
201 treasures.

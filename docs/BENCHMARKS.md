# Benchmarks

How fast Duke plays each game, measured on the Mac mini M4. Wall-clock time runs from the first commit on a game to the moment it was beaten. Update a row when a run finishes.

| Game | Result | Time to beat | Notes |
|------|--------|--------------|-------|
| Duolingo | 838,098 XP, 202-day streak | Never ends | 21,640 XP on 2026-10-27. Fastest courses: Latin 1,555 XP an hour, Hawaiian 1,502, Romanian 1,439. Chess about 514 |
| Factorio | Rocket launched (2 rockets) | Unassisted rocket 2026-10-02 20:45 | 44 of 44 silo techs. The first rocket was assisted |
| FEZ | Beaten, 32 of 32 cubes | About 18 hours (2026-10-25 13:05 to 2026-10-26 07:00) | Star Gate ending, no cheats. New Game+ max-out parked at 18 gold, 15 anti, 2 bits |
| Mirage | Beaten | 3,725 steps, about 37 seconds of game time | One hit taken, healed by a prickly pear |
| Game Dev Tycoon | Still playing (slot 5) | Not beaten | The first studio went bankrupt; the driver now releases games itself |
| Papers, Please | Day 9 of 31 | In progress since 2026-10-27 15:15 | About 24 seconds per entrant. Lost the family once (ending 2) on day 7 and replayed from day 5. Run log in `games/papers/progress.jsonl` |

## Papers, Please speed

A good human clears an entrant in about 15 to 20 seconds. Duke is at about 24 (was 45), most of it waiting on drags, the stamp tray and the next entrant walking up. Each entrant pays 5 credits, so every second saved feeds the family. Targets: 25 seconds an entrant, every day finished with money left after rent, food and heat.

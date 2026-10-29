# Oxygen Not Included: the rules the bot plays by

Everything here was read from the game's own code (Assembly-CSharp.dll, decompiled locally with ilspycmd, class names given) or measured through the bridge. Read the code before acting on a guess: two guessed pump spots and one wet dig killed six dupes across colonies 5 and 6.

## Water

- A pitcher pump draws only when both of its columns are open for 1 to 4 cells below it. It stops at the first solid cell or at another building (`PumpingStationGuide.GetDepthAvailable`). One sand cell under a pump leaves it reading Empty beside tons of water. `preflight.py` checks every pump in the plan against this rule on a fresh, paused map.
- A dupe has to reach the pump to fetch from it. On this seed the pool's pump stands at 189,110 and is worked from a dry step at 188,110.
- The Super Computer drinks water: 50 kg a point, plus a 750 kg buffer it fills up front (`AdvancedResearchCenterConfig`). Distillation alone costs 1 t. It competes with the mushers, so the bot drops its priority when water runs low.
- A Mush Bar is 75 kg of water and 75 kg of dirt for 800 kcal, so each dupe drinks about 94 kg of water a cycle as mush.
- The bridge's `have` counts only stored water. The bot adds each pump's Liquid Available from its status line.
- This seed has about 200 cells of clean water in 8 pools, and 79 cells of polluted water. Water exists; reaching it is the work.

## Research

- Speed is the dirt rate times (3 + 0.4 x Learning, + 0.15 if lit) divided by 50 kg a point (`ResearchCenter.OnWorkTick`, `Workable.GetEfficiencyMultiplier`). A Learning 9 dupe makes roughly 70 points a cycle, while tier one techs cost 15 to 20.
- So the limit is time at the station, not speed. The highest-Learning dupe gets research priority 5 (Very High), dropped back to 3 when food runs low.
- Every tech past tier one needs advanced points from the Super Computer, which needs a dupe with Advanced Research (`Researching1`). Only that one skill is taught, because every skill raises the morale need.
- The bridge refuses to build anything whose tech isn't done, which is the build menu's own gate. Before this fix, colonies 6 and 7 got a coal generator and a Super Computer early, and both were taken down.

## Food

- Mealwood's seed is `BasicSingleHarvestPlantSeed`. There is no `BasicPlantSeed`, and every colony before 7 ordered that name, so no planter ever got a seed.
- Uprooting a wild Mealwood gives one seed. A harvest gives one with a 10% chance plus the harvester's bonus (`SeedProducer`). Seeds, not planter boxes, are the limit.
- A domestic Mealwood makes about 200 kcal a cycle, so a dupe needs 5 plants.

## Power

- The Coal Generator (`Generator`, tech `Combustion`) gives 600 W and burns 1 kg of coal a second. The Super Computer draws 120 W and the Research Station 60 W.

## How colonies died

| Colony | Last cycle | Cause |
|---|---|---|
| 1 | 15 | A bulk dig opened a pool and trapped a dupe, and nobody cooked |
| 2 | 15 | A tunnel dug out the floor under the musher |
| 3 | 20 | Water: the second pump finished as the last dupe starved |
| 4 | 22 | Dirt: everything reachable was dug by cycle 14 |
| 5 | 31 | Water: terrariums and the Super Computer drained the pumps, and a wet dig drowned two |
| 6 | 28 | Water: both pumps stood over sand, and the fix came two cycles late |

## Winning

See [VICTORY.md](VICTORY.md). Home Sweet Home needs cycle 200, 12 dupes, morale at the minimum, and a Great Monument.

# Oxygen Not Included: survival guide for a bot

Researched 2026-10-28. Wiki pages are flagged as possibly outdated (last tuned to U58/U59-era builds). The ONIMods repo was last tested on U59-737790. Anything marked UNVERIFIED was not found in a source and must be checked with the bridge (section 0) before the bot relies on it.

## 0. Verify IDs on the live game first

Duke's bridge (`/Users/joshua/Documents/Code/duke/games/oni/bridge/DukeBridge.cs`, HTTP on 127.0.0.1:8741) already reads the real game state:
- `{"op":"buildable"}` lists every unlocked building with its PrefabID, size and materials. This is the authoritative prefab ID list.
- `{"op":"techs"}` lists every `Db.Get().Techs` ID with its completion flag and unlocks. This is the authoritative tech ID list.
- The bridge calls `Assets.GetBuildingDef(id)` and `Db.Get().Techs.TryGet(id)`, so a wrong ID returns an error, not a silent miss.

Ask the bridge once per save and cache the output. Do not hardcode the IDs below.

## 1. Cycles 1 to 15 build order

Start: 3 Duplicants, 16,000 kcal of rations, each Duplicant burns about 1,000 kcal a day. The wiki says rations last "a little over 6 cycles" for 3 (inference from that number). Source: [Guide/Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started).

Cycle 1
- Dig toward water and the nearby oxygen pocket with short tunnels. Avoid polluted water, poison gas and vacuum. Source: [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started).
- Dig one room for the Outhouse and one for cots. Keep the digging small, since every dig adds Dirt that research and the Microbe Musher both need.
- Do not accept new Duplicants early. Getting Started says "Don't expand too fast too early." Stay at 3 or 4 until oxygen and food are stable. Source: [jeu.video beginner guide](https://jeu.video/en/guide/oxygen-not-included-beginner-guide).

Cycles 1 to 3
- Outhouse first. It is 2x3, costs 200 kg of Raw Mineral or Wood, and holds 15 uses at 13 kg Dirt each, then a Duplicant must empty it. Source: [Outhouse](https://oxygennotincluded.wiki.gg/wiki/Outhouse).
- Pitcher Pump over the water source, Bottle Emptier for polluted water. Source: [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started).
- Power: Manual Generator plus a Tiny Battery. Duplicants crank it. Wire through floors and walls to avoid negative Decor. Source: [Research](https://oxygennotincluded.wiki.gg/wiki/Research), [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started).
- Research Station: 2x2, -60 W, 400 kg Metal Ore, available from the start. Put it inside the powered room nearest the Manual Generator so the walk is short. Source: [Research Station](https://oxygennotincluded.wiki.gg/wiki/Research_Station).

Cycles 3 to 6
- Microbe Musher: 2x3, -240 W, 400 kg Metal Ore. Takes 75 kg Dirt and 75 kg Water and makes a Mush Bar of 800 kcal. Power it from the Manual Generator and battery. Source: [Microbe Musher](https://oxygennotincluded.wiki.gg/wiki/Microbe_Musher).
- Wash Basin at the entrance of the food room. Source: [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started).
- Cots: leave a gap between couples. Sleeping in a bed lowers stress and stops the Sore Back debuff. Source: [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started).
- Oxygen: the wiki says oxygen is not the first bottleneck. Add one or two Oxygen Diffusers (they need Algae and power) and track Algae stock. The Electrolyzer comes later. The wiki page for "Algae Deoxidizer" returned 404, so do not build that name without checking `buildable`. Source: [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started), [jeu.video](https://jeu.video/en/guide/oxygen-not-included-beginner-guide).

Cycles 6 to 15
- Food: Mealwood in Planter Boxes is enough early. Keep Planter Boxes away from other machines because heat kills plants. Farm Tiles (Meal Preparation) use less space. Source: [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started), [jeu.video](https://jeu.video/en/guide/oxygen-not-included-beginner-guide).
- Storage: at most 2 Storage Bins at first.
- Printing Pod: 4x4, Iron Ore. It prints every 3 cycles and Duplicants come out of it. Its ID is unconfirmed (see section 3). Source: [Printing Pod](https://oxygennotincluded.wiki.gg/wiki/Printing_Pod).
- Super Computer: unlocked by Advanced Research. It needs a Duplicant with the Advanced Research skill and it uses power and 50 kg water per point. The wiki gives no cycle number, so the bot should wait until Novice research is well along and power is steady. Source: [Research](https://oxygennotincluded.wiki.gg/wiki/Research).

Research order (display names, not IDs; the IDs come from `techs`)
1. Basic Farming (unlocks Algae Terrarium; destroy it once CO2 is under control).
2. Planter Box (Food branch).
3. Power Regulation.
4. Meal Preparation (unlocks Farm Tiles).
5. Then food, decoration, power, gas and liquid, as in the 2017 Steam sequence (toilet, dig room, water, power, Microbe Musher, beds, then research). Source: [Steam discussion](https://steamcommunity.com/app/457140/discussions/0/1694918539665963769).
6. Advanced Research, then Super Computer.
Do not research oxygen first. Getting Started says the colony would starve before it runs out of oxygen.

Research totals: 3,085 Novice points at 50 kg Dirt each (154.3 t), 3,000 Advanced points, 3,200 Interstellar points. Telescope needs Celestial Detection and a Field Research Duplicant. Virtual Planetarium needs Computing and an Astronomy Duplicant. Source: [Research](https://oxygennotincluded.wiki.gg/wiki/Research).

Dirt pressure: research, the Microbe Musher and the Outhouse all eat Dirt. The bot must keep digging or the research queue stalls.

## 2. How new colonies die

- CO2 pooling. Duplicants breathe out CO2 and it builds up in sealed rooms. Prevention: Algae Terrariums (Basic Farming) and an Oxygen Diffuser early, no sealed rooms, vent the pocket where Duplicants sleep. (General play knowledge, not checked against a source.)
- Starvation. Rations run out around cycle 6 for 3 Duplicants. Have a Microbe Musher or Planter Box running before then. Source: [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started).
- Stress and Sore Back. Beds and cots, plus a Wash Basin, keep stress down. Morale rooms come after power. Source: [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started), [jeu.video](https://jeu.video/en/guide/oxygen-not-included-beginner-guide).
- Heat. Planter Boxes die near heat, so keep them clear of hot machines. Overheating machines cause the rest. Source: [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started). Anything else on heat is general play knowledge.
- Bladder and germs. Duplicants need a toilet by cycle 1 or they leak Polluted Water on the floor. Source: [Getting Started](https://oxygennotincluded.wiki.gg/wiki/Guide/Getting_Started).
- Too many Duplicants. Growing faster than food and oxygen is the usual root cause. Source: [jeu.video](https://jeu.video/en/guide/oxygen-not-included-beginner-guide).

## 3. Prefab IDs

Confirmed in sources: `ResearchCenter` appears as the code identifier `ResearchCenter.OnWorkTick` on the [Research Station wiki page](https://oxygennotincluded.wiki.gg/wiki/Research_Station). `ManualGeneratorConfig` is a real class name in a [mod tutorial](https://github.com/O-n-y/OxygenNotIncludedModTemplate), so `ManualGenerator` is probably right. `Ladder` appears only as an example in DukeBridge's build op comment.

Everything else is UNVERIFIED. The wiki does not publish prefab IDs, and no public source had them.

| Building | Brief's ID | Status |
|---|---|---|
| Research Station | ResearchCenter | likely (code name seen) |
| Manual Generator | ManualGenerator | likely (class name seen) |
| Outhouse | Outhouse | UNVERIFIED |
| Wash Basin | WashBasin | UNVERIFIED |
| Cot | Bed | UNVERIFIED |
| Microbe Musher | MicrobeMusher | UNVERIFIED |
| Planter Box | PlanterBox | UNVERIFIED |
| Farm Tile | FarmTile | UNVERIFIED |
| Oxygen Diffuser | MineralDeoxidizer (recalled) | UNVERIFIED |
| Algae Terrarium | AlgaeHabitat (recalled) | UNVERIFIED |
| Printing Pod | Headquarters (recalled) | UNVERIFIED; the bridge finds it through `Components.Telepads` |
| Super Computer | AdvancedResearchCenter (recalled) | UNVERIFIED |
| Ladder, Tile | Ladder, Tile | UNVERIFIED |

Tech IDs are also UNVERIFIED. The brief's examples (`FarmingTech`, `BasicResearch`) are not in any source found. The peterhaneve ResearchQueue code reads tech IDs only at runtime through `Db.Get().Techs.Get(id)` and `tech.Id`, with no literals. Source: [ResearchQueue](https://github.com/peterhaneve/ONIMods/tree/main/ResearchQueue).

## 4. Winning

- Home Sweet Home (Colonize Imperative): survive 200 cycles, keep morale at 16, print 12 Duplicants, and build a Great Monument. The monument is 5x15 tiles of Glass, Ceramic, Diamond, Obsidian and Plastic at 2,500 kg each, plus 17,500 kg Steel. Cycle floor: 200. Sources: [Achievements](https://oxygennotincluded.wiki.gg/wiki/Achievements), [Monument Base](https://oxygennotincluded.wiki.gg/wiki/Monument_Base), [Great Monument](https://oxygennotincluded.wiki.gg/wiki/Great_Monument).
- The Great Escape (Escape Imperative): base game needs only a one-way Duplicant mission to the farthest Starmap destination. Spaced Out adds five Mini-Pod asteroid colonies and the Temporal Tear Opener. No cycle count is listed. Source: [Achievements](https://oxygennotincluded.wiki.gg/wiki/Achievements), [Temporal Tear](https://oxygennotincluded.wiki.gg/wiki/Temporal_Tear).
- Side achievements: Turn of the Century (cycle 100, one Duplicant alive) and One Year, to be Exact (cycle 365.25). These are not endings. Source: [Achievements](https://oxygennotincluded.wiki.gg/wiki/Achievements).
- Only the 200-cycle floor is sourced. The "three victories" framing in the brief is not on the wiki. The wiki lists imperatives per start world, and the Steam thread calls the two main ones the endings. Rough cycle ranges for the Great Escape are not sourced. Treat any number as a guess until a speedrun or leaderboard source is checked.

## 5. Mods and bot projects

- ONIMods (peterhaneve): [repo](https://github.com/peterhaneve/ONIMods). Useful: ResearchQueue (`TechTierSorter.cs`, saved queue of tech IDs), PLib (shared library), FastTrack, MoreAchievements, DebugNotIncluded. Check the LICENSE before copying code. Tested on U59-737790.
- Cairath modding wiki: [Introduction](https://github.com/Cairath/Oxygen-Not-Included-Modding/wiki/Introduction). It says not to publish decompiled game code. Decompile locally only for your own reference.
- Save-file tools (not live state): [oni-duplicity](https://github.com/RoboPhred/oni-duplicity) (MIT web editor) and [oni-save-parser](https://classic.yarnpkg.com/en/package/oni-save-parser) (MIT, npm). The README says save version 7.15, and the npm page says 7.17. Check the version against the current build.
- Avoid romen-h/ONI-Mods and its fork Pertel/ONI-Mods. Their code is source-available with no reuse license.
- No public ONI AI or bot project turned up in search. Duke's DukeBridge (`/Users/joshua/Documents/Code/duke/games/oni/bridge/DukeBridge.cs`) is the live-state route already in use: ops `state`, `grid`, `dig`, `build`, `research`, `techs`, `buildable`, `speed`, `pause`, `invoke`, `camera`. It starts Survival through `ModeSelectScreen.OnClickSurvival`.

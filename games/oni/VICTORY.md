# Oxygen Not Included: how the base game is won (2026-10-28)

Joshua owns the base game only, no Spaced Out. The rules below come from the game's own code (`Database.ColonyAchievements` and `SpacecraftManager` in Assembly-CSharp.dll, read with ilspycmd) and the wiki. The earlier note in this file covered the Spaced Out Great Escape, a 27-cycle speedrun that doesn't exist in the base game.

## The two wins

- **Home Sweet Home** (`Thriving`): cycle 200, morale at the minimum (wiki: 16), 12 living dupes, and a Great Monument. The monument is three 5x5 parts. Bottom: 7,500 kg steel and 2,500 kg obsidian. Middle and top: 2,500, 2,500 and 5,000 kg each. Per the wiki that totals 17,500 kg steel and 2,500 kg each of glass, ceramic, diamond, obsidian and plastic.
- **The Great Escape** (`ReachedDistantPlanet`): one rocket in flight to the Temporal Tear (`SpaceDestinationTypes.Wormhole`). The Tear is always the farthest starmap tier (wiki: 180,000 km), so a telescope has to reveal that far first. Per the wiki only the Hydrogen Engine with liquid oxygen reaches it. Every engine is built from steel. The research path is Introductory Rocketry, Hydrocarbon Combustion and Cryofuel Combustion, which needs Interstellar research points. Liquid hydrogen means cooling to -255 C, which takes a Thermo Aquatuner and Super Coolant.

Both are late-game wins. Each needs steel, which needs a Metal Refinery (tech `Smelting`), and every tech past the first tier needs the Super Computer's advanced points.

## Time

- At the in-game 3x speed a cycle takes about 3.5 real minutes for this colony. The game's own `ToggleRidiculousSpeed` (ultraSpeed 10) measured 0.27 cycles in 30 s, about 1.9 minutes a cycle, because the sim can't keep up past roughly 5x. It is fast-forward only and changes no rules. It resets on every game launch, and calling it again toggles it back off.
- Home Sweet Home can't finish before cycle 200. At 1.9 minutes a cycle that is 6.3 hours of clock, and only if the colony holds 12 dupes the whole way.
- No source gives a cycle count for a base-game Great Escape. Strong human players report hundreds of cycles.

## Milestones on the way

Super Computer, then Water Sieve (`Distillation`), Coal Generator (`Combustion`), Metal Refinery for steel (`Smelting`), Survive 100 cycles, the first rocket (steam engine, `BasicRocketry`), Telescope (`SkyDetectors`), plastic, the Aquatuner (`LiquidTemperature`), and finally liquid oxygen and hydrogen.

## Sources

- Game code: Assembly-CSharp.dll from the Steam install, types named above.
- https://oxygennotincluded.wiki.gg/wiki/Achievements
- https://oxygennotincluded.wiki.gg/wiki/Starmap
- https://oxygennotincluded.wiki.gg/wiki/Rocket
- Guide notes with citations for every number: scratchpad `oni-guides.md` (merged here; survival numbers are in GUIDE.md).

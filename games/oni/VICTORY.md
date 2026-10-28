# Oxygen Not Included: fastest honest victory (research note, 2026-10-28)

Scope: base game plus Spaced Out DLC, vanilla rules, Survival, no mods, game speed 3x (about 200 real seconds per cycle).

## 1. What unlocks each win

- The game has no single win screen. The end goals are "Imperatives" in the achievement list. The wiki names five Imperative types: Defense, Power, Exploration, Escape, Colonize. "Transcend" is not in the wiki's list, and I found no source for it.
- Great Escape (Escape Imperative, Spaced Out): open the Temporal Tear, then send a rocket through it. The Temporal Tear Opener sits on the Tundra Asteroid. It is a 3x4 tile building that needs 3 tiles of sky line of sight, 5 printing pods built and activated across all asteroids (4 mini pods beyond the home one), and 10,000 Radbolts consumed (5 per second during startup) before it can fire. A rocket that goes through never comes back.
- Home Sweet Home (base game): survive 200 cycles, hold 16 Morale, print 12 Duplicants, and build a Great Monument. A Steam achievement snippet ties it to the Colonize Imperative (search result, not confirmed on the wiki).
- Base game Great Escape: the wiki says the base game version is only the one-way trip. A forum post in search results claims a base game run of 204 cycles for both Home Sweet Home and Great Escape (self-reported, not opened).
- Fastest: Great Escape. Home Sweet Home has a hard floor of 200 cycles, which is at least 200 x 200 s = 11.1 hours at top speed. It cannot fit in a 6 to 8 hour day.

## 2. Speedrun.com (Oxygen Not Included, game id 46wr3ln1, read via the public API)

- Categories: First Rocket Launch, Great Escape, Steel Smelting, Making Plastic, Blast Demolior (No Exploit). There is no Home Sweet Home or Colonize category.
- Great Escape world record: TabeYuriko, 2025-01-17, in-game finish at cycle 27.33, about 1h50m real time (runner's own comment). The leaderboard shows 2h11m39s because the site converts cycles at 300 s each. Do not read the leaderboard figure as real time.
- Route from the runner's timestamps: pick Duplicants and launch by 1:22; defrost the frozen friend on the teleporter planet in cycle 1; power station in cycle 5; rocket built inside the base in cycle 7; two mini-pod scouting trips in cycles 14 to 17; pioneer rocket scouts Tundra and the tear by cycle 20; a second rocket carries the team to Tundra by cycle 22; fire at cycle 27.
- Rules that matter: no mods, no save loading except for bug fixes, video must start at the main menu and show dupe picking.

## 3. Real time

- 3x speed gives about 200 s per cycle (wiki Schedule page gives 600 s at 1x, so 200 s at 3x is my arithmetic).
- Pure clock floor for the record: 27.3 cycles x 200 s = about 91 minutes. The record's real time was about 110 minutes.
- At top speed, 1 hour is about 18 cycles and 2 hours is about 36 cycles.
- A careful non-expert bot will probably need far more cycles than the record. My estimate is 45 to 80 cycles, or 2.5 to 4.5 hours of top-speed clock before pauses and recovery. This is an estimate, not a sourced number.
- Beating it in 1 to 2 hours is not realistic. It needs record-pace play with zero slack.
- Realistic target for today: 6 to 8 hours is 108 to 144 cycles of top-speed clock. That is enough to finish Great Escape if the colony survives. Set milestones as fallbacks: rocket launch, Opener built, 5 printing pods active, 10,000 Radbolts charged.

## 4. Speed mods

- Speed Control (original Workshop mod): marked Outdated. Commenters from 2021 to 2025 say it no longer loads on the current build. It offered x1, x3 and x10.
- Customizable Speed by Pholith, Workshop 2002421412: last changelog update August 2024. Users report that speed drops back to default mid-game, and that timer sensors misbehave at high multipliers. A Klei developer said a duplicant walking speed bug at 3x may come from speed-changing mods.
- Community fork, Workshop 2552175137: mentioned in a 2021-era thread. Not checked.
- GitHub: https://github.com/daviscook477/ONIMods (Peter Han; last tested on game version RP-381897) and https://github.com/Zonkeeh/ONI-Mods. I did not verify that either has a speed feature.
- Gameplay effect: speed mods change tick rate and sensor timing, so they change the rules the bot plays under. The speedrun rules ban all mods. The wiki Schedule page says the engine appears to evaluate 5 ticks per second, from the author's own tests.
- Not recommended for an honest run. The brief says the game's own systems only.

## 5. Route recommendation

Go for the Great Escape in vanilla Spaced Out at 3x only. Skip Home Sweet Home today because of its 200-cycle floor, and skip speed mods because they change the simulation. Plan: launch a rocket early (by about cycle 7 on the record pace), set up mini pods on the asteroids and scout the Tundra, build the Temporal Tear Opener with sky line of sight checked, charge 10,000 Radbolts, then send the rocket and one Duplicant through the tear. Budget 6 to 8 hours and expect 50 to 100 cycles on a first try. If the colony collapses, start a new colony. Do not edit saves.

## Sources

- https://oxygennotincluded.wiki.gg/wiki/Achievements
- https://oxygennotincluded.wiki.gg/wiki/Temporal_Tear
- https://oxygennotincluded.wiki.gg/wiki/Temporal_Tear_Opener
- https://oxygennotincluded.wiki.gg/wiki/Schedule
- https://www.speedrun.com/api/v1/games/46wr3ln1/categories
- https://www.speedrun.com/Oxygen_Not_Included/runs/yoq63n7z (Great Escape record)
- https://www.speedrun.com/Oxygen_Not_Included/runs/me23e3qm (Blast Demolior record)
- https://steamcommunity.com/sharedfiles/filedetails/?id=2002421412 (Customizable Speed)
- https://steamcommunity.com/sharedfiles/filedetails/?id=2552175137 (fork, unverified)

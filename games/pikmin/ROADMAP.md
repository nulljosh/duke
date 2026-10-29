# Pikmin 2 roadmap

The game is done when all 201 treasures are home and the Dream Den is cleared. The route follows `PLAYBOOK.md`. `forecast.py` turns this list and the rows in `progress.jsonl` into a finish estimate. Rerun it after each new row, because each row makes the estimate sharper.

## Milestones, in order

| # | Milestone | Treasures | Needs |
|---|-----------|-----------|-------|
| 1 | Valley of Repose overground | 4 (1 home) | Reds |
| 2 | Emergence Cave | 2 | Purples from the Candypop Buds for the Spherical Atlas (weight 101) |
| 3 | Awakening Wood overground, Blue Onion | 7 | Atlas home, Blues |
| 4 | Hole of Beasts | 5 | 15+ Reds for floor 3, Empress Bulblax |
| 5 | White Flower Garden | 7 | 20 Purples for the bag, Ivory buds make Whites |
| 6 | Bulblax Kingdom | 10 | Yellows for wires, Emperor Bulblax (Scorch Guard) |
| 7 | Snagret Hole | 15 | Blue, White, Yellow; Pileated Snagret |
| 8 | Yellow Onion, Perplexing Pool | 0 | White and Red for the poison gate |
| 9 | Subterranean Complex | 9 | Yellows |
| 10 | Frontier Cavern | 15 | Whites for buried treasure |
| 11 | Citadel of Spiders | 11 | Beady Long Legs |
| 12 | Glutton's Kitchen | 14 | 40 Yellow, 30 Purple, Giant Breadbug |
| 13 | Shower Room | 13 | |
| 14 | Submerged Castle | 5 | Blues, Waterwraith (Pluckaphone) |
| 15 | Debt paid, Wistful Wild opens | 0 | 10,000 Poko |
| 16 | Cavern of Chaos | 13 | |
| 17 | Hole of Heroes | 12 | |
| 18 | Dream Den | 13 | Titan Dweevil, Louie |
| 19 | Pool and Wistful Wild overground | 46 | |

The cave counts for White Flower Garden, Bulblax Kingdom, Snagret Hole, Citadel of Spiders, Glutton's Kitchen and Frontier Cavern come from the wiki (see `PLAYBOOK.md`). The other counts come from the standard list of 201 treasures. The split of the overground rows has not been checked in the game yet.

## Forecast (2026-10-29, Day 4)

1 of 201 treasures home after 3.5 hours of bot play. 4,000 Monte Carlo runs give this:

| | Bot hours left |
|---|---|
| P10 | 374 |
| P50 | 426 |
| P90 | 482 |

How the model works: each treasure left costs the pace so far (210 minutes per treasure, setup included), times a learning factor between 0.15 and 0.5, times a difficulty weight for the area, times lognormal noise. Each Onion, gate and boss adds 0.5 to 2 hours. The spread is narrow only because the learning factor is a guess. The real uncertainty is bigger until about ten more treasures are logged. `forecast.png` draws 120 of the runs, with the P10, P50 and P90 paths in gold.

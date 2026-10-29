# Duke brand kit and design system

Nine game tiles with play in the middle. Duke plays every one of them, for real: Duolingo, Factorio, Game Dev Tycoon,
FEZ, Papers, Please, Oxygen Not Included, Pokemon Sapphire, Pikmin 2 and Mirage. The name stays a nod to Duke
Kahanamoku, who made riding the wave look easy.

## The mark
A three by three grid of rounded tiles on an ink tile. Each tile is one game's colour, like a shelf of cartridges. The
middle tile is white with an ink play button: the game Duke is playing right now. No text, no outline. At 29 px it
reads as a bright grid with one white square, and nothing else in the dock looks like it. It replaced the surfboard on
a wave on 2026-10-29, which said surfing, not games.

- `../Duke.icon` is the source of truth (Icon Composer), used by the Mac and iPhone apps.
- `../icon.svg` is the flat copy for the README and the landing. `icon-1024.png` is the App Store size, no alpha.
- `mark.svg` is the grid alone; `icon-tile.svg` is the square tile with no corner mask.
- The tile colours are the game colours below, lifted a little so they hold up on ink. Clear space is one tile.
  Smallest size 16 px.

## Colour
The UI owns one colour, Duke orange, the warmth of the Factorio tile. Everything else is ink and white, so the game
colours do the talking.

| Role | Light | Dark |
|---|---|---|
| Accent: highlights, correct answers, the focus ring | `#E8691A` Duke orange | `#E8691A` |
| Links, buttons and white text on top | `#C2410C` | `#FF8A3D` links |
| Ink: the icon tile, the band | `#16161A` | `#1C1C1E` |
| Icon gradient | `#2E2E34` to `#0C0C0E` | same |
| Background | `#FFFFFF` | `#000000` true black |
| Surface | `#F5F5F7` | `#1C1C1E` |
| Text | `#1D1D1F` | `#F5F5F7` |

Dark mode is true black, a console between games. Never brown, beige, purple or teal in the UI.

## Games
Every game gets one colour (`--g-*` in `tokens.css`) and a bold white line glyph on the same rounded tile as the icon, so the landing's game cards read as one family. Glyphs are our own drawings, a nod to each game, never its sprites or logo.

| Game | Token | Colour | Glyph |
|---|---|---|---|
| Duolingo | `--g-duolingo` | `#2E8B3A` | a speech bubble with a check |
| Factorio | `--g-factorio` | `#C4570F` | a gear |
| Game Dev Tycoon | `--g-gdt` | `#0063BA` | a floppy disk |
| FEZ | `--g-fez` | `#B08A00` | a cube |
| Papers, Please | `--g-papers` | `#B5302A` | a stamp |
| Oxygen Not Included | `--g-oni` | `#3D7A5C` | an asteroid with two craters |
| Pokemon Sapphire | `--g-pokemon` | `#203868` | a ball, on the navy of the game's text boxes |
| Mirage | `--g-mirage` | `#9A4A1F` | a sun setting on the horizon |
| Pikmin 2 | `--g-pikmin` | `#1F6E3A` | a sprout with a leaf on its stem |

Each game's own progress art (the Pokemon graph and iPhone wallpaper, the ONI wallpaper) takes that game's look on purpose: pixel font, its text box frame, scaled with no smoothing. The Pikmin 2 graph sits on the brand's ink with the game's red and gold.

## Type
Duke Sans: Inter 5.3 by Rasmus Andersson (SIL Open Font License 1.1, bumped from 5.2.5 on 2026-10-26), renamed, with its curly quotes redrawn as curling wave crests. Proportionally spaced, drawn in the spirit of San Francisco and Helvetica. Regular, Medium, Semibold and Bold live in `../fonts/` (ttf for the app, woff2 for the web, `OFL.txt` beside them). `../tools/gen_font.py` rebuilds them from the pinned Inter release, byte for byte.

Scale: 34/41 large title, 22/28 title, 17/24 body, 15/20 subhead, 13/16 footnote. Headlines tighten to -0.022em. The fallback is the system face: `-apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif`.

## Art
Walter Crane, Neptune's Horses (1892, public domain), dithered into a halftone dot mask (`../web/art/neptune.png`) and tinted Duke orange on the ink band. Poseidon's horses are the waves Duke rides. The surf nods that stay are the name, this art and the wave-crest quotes in Duke Sans.

## Space and shape
- The 8 point grid: 4, 8, 12, 16, 24, 32, 48, 64, 96. Side margin 20. Reading column 680.
- Radii: cards 28, grouped lists 20, controls fully round, icon 22.5 percent.
- Controls are 48 point capsules, one height per row. Focus is a 4 point ring at 30 percent accent.
- Motion is 0.2 s ease and honours reduced motion.

`tokens.css` holds all of it. The landing loads a copy (`deploy.sh` puts it in `web/`). The app mirrors the accent and the font in `RunState.swift` (`Color.duke`, `Font.duke`).

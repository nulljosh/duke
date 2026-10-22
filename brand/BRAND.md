# Surf brand kit and design system

A surfboard catching the wave. Surf rides Duolingo so you don't have to.

## The mark
A bold white surfboard, tilted into the wave, stringer cut down the middle, fin at the tail. One glyph on a gradient tile. No text, no outline.

- `../Surf.icon` is the source of truth (Icon Composer), used by the Mac and iPhone apps.
- `../icon.svg` is the flat copy for the README and the landing. `icon-1024.png` is the App Store size, no alpha.
- `mark.svg` is the board alone in `currentColor`. `icon-tile.svg` is the square tile with no corner mask.
- Clear space is the width of the fin. Smallest size 16 px.

## Colour
One colour, from clrs.cc.

| Role | Light | Dark |
|---|---|---|
| Accent: links, buttons, correct answers | `#0074D9` clrs.cc Blue | `#6CB6FF` |
| Buttons and bands, white text on top | `#0063BA` | `#0063BA` |
| Icon gradient | `#0074D9` to `#001F3F` clrs.cc Navy | same |
| Background | `#FFFFFF` | `#141F33` FEZ night |
| Surface | `#F5F5F7` | `#1A2740` |
| Text | `#1D1D1F` | `#F5F5F7` |

Dark mode is the deep blue of a FEZ night, the sea after dark. Never brown, beige, purple or teal.

## Type
Surf Sans: Inter by Rasmus Andersson (SIL Open Font License 1.1), renamed, with its curly quotes redrawn as curling wave crests. Proportionally spaced, drawn in the spirit of San Francisco and Helvetica. Regular, Medium, Semibold and Bold live in `../fonts/` (ttf for the app, woff2 for the web, `OFL.txt` beside them). `../tools/gen_font.py` rebuilds them from the pinned Inter release, byte for byte.

Scale: 34/41 large title, 22/28 title, 17/24 body, 15/20 subhead, 13/16 footnote. Headlines tighten to -0.022em. The fallback is the system face: `-apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif`.

## Art
Walter Crane, Neptune's Horses (1892, public domain), dithered into a halftone dot mask (`../web/art/neptune.png`) and tinted with the band colour. Poseidon's horses are the waves Surf rides.

## Space and shape
- The 8 point grid: 4, 8, 12, 16, 24, 32, 48, 64, 96. Side margin 20. Reading column 680.
- Radii: cards 28, grouped lists 20, controls fully round, icon 22.5 percent.
- Controls are 48 point capsules, one height per row. Focus is a 4 point ring at 30 percent accent.
- Motion is 0.2 s ease and honours reduced motion.

`tokens.css` holds all of it. The landing loads a copy (`deploy.sh` puts it in `web/`). The app mirrors the accent and the font in `RunState.swift` (`Color.surf`, `Font.surf`).

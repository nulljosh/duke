#!/usr/bin/env python3
"""Duke's icon glyph: nine game tiles as 8-bit blocks, one per game, the white one in the middle playing now.
Each block sits on a 24 px pixel grid (1024 canvas) with stepped corners, a lit top-left edge and a shaded
bottom-right edge, like a block in an old platformer. Prints SVG markup for make_brand.py.
  python3 tools/icon.py > /tmp/glyph.svg"""
U = 24                                         # one game pixel: chunky, so the blocks still read at 29 px
POS, N = [192, 432, 672], 7                    # block origins and size in pixels (7 x 24 = 168)
GAMES = [["#3FAE4A", "#E8691A", "#2B7BD6"],    # Duolingo, Factorio, Game Dev Tycoon
         ["#D9A800", None, "#D63A31"],         # FEZ, now playing, Papers, Please
         ["#4E9A6E", "#4A6FC4", "#C2602A"]]    # Oxygen Not Included, Pokemon Sapphire, Mirage


def shade(hexc, f):
    c = [int(hexc[i:i + 2], 16) for i in (1, 3, 5)]
    c = [round(v + (255 - v) * f) if f > 0 else round(v * (1 + f)) for v in c]
    return "#%02X%02X%02X" % tuple(c)


def px(x, y, w, h, fill):
    return f'<rect x="{x}" y="{y}" width="{w * U}" height="{h * U}" fill="{fill}"/>'


def block(x, y, base):
    """Stepped corners (one pixel cut), body, light rim top and left, dark rim bottom and right."""
    hi, lo = shade(base, .38), shade(base, -.34)
    out = [px(x + U, y, N - 2, 1, hi), px(x, y + U, 1, N - 2, hi),                           # lit rims
           px(x + U, y + (N - 1) * U, N - 2, 1, lo), px(x + (N - 1) * U, y + U, 1, N - 2, lo),  # shaded rims
           px(x + U, y + U, N - 2, N - 2, base),
           px(x + U, y + U, 1, 1, shade(base, .7))]                                          # glint
    return out


def play(x, y):
    """A pixel play arrow, stepped, centred in the block."""
    ink, out = "#16161A", []
    rows = [1, 2, 3, 2, 1]                     # width of the arrow on each row of pixels, tip to the right
    for r, w in enumerate(rows):
        out.append(px(x + 2 * U, y + (r + 1) * U, w, 1, ink))
    return out


parts = []
for r, y in enumerate(POS):
    for c, x in enumerate(POS):
        base = GAMES[r][c] or "#FFFFFF"
        if GAMES[r][c] is None:
            parts += [px(x + U, y, N - 2, 1, "#FFFFFF"), px(x, y + U, 1, N - 2, "#FFFFFF"),
                      px(x + U, y + (N - 1) * U, N - 2, 1, "#C9C9CF"), px(x + (N - 1) * U, y + U, 1, N - 2, "#C9C9CF"),
                      px(x + U, y + U, N - 2, N - 2, "#F2F2F5")] + play(x, y)
        else:
            parts += block(x, y, base)
print('<g shape-rendering="crispEdges">' + "".join(parts) + "</g>")

"""Papers, Please wallpaper art for wallpapers.py: original pixel art in the game's palette (no sprites, logos or crest
from the install). A grey checkpoint yard seen from above, a queue of silhouettes, and the inspector's desk with an open
passport and an APPROVED stamp. Drawn low, scaled up with NEAREST and finished like the FEZ art: dither, scanlines, grain."""
import random
from PIL import Image, ImageDraw
from fezart import BAYER, SIZES, dither, grain, scanlines, vignette

BLACK, OLIVE, DARK_OLIVE, RED, CREAM, WHITE = "#000000", "#4b5e4c", "#293229", "#c41430", "#e0e3b9", "#ffffff"
NAVY, STAMP, DESK, LIGHT_GREY, EDGE = "#2c3550", "#4f7a3a", "#1c1612", "#9a9a9a", "#5a5a5a"
GREYS = ["#5a5a5a", "#6e6e6e", "#828282", "#9a9a9a"]   # the ground, dithered from dark at the top to light at the bottom

GLYPHS = {   # 5x7 pixel font, only the letters the wallpaper prints
    " ": (".....",) * 7,
    "A": (".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"),
    "D": ("####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."),
    "E": ("#####", "#....", "#....", "####.", "#....", "#....", "#####"),
    "I": ("#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"),
    "N": ("#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"),
    "O": (".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."),
    "P": ("####.", "#...#", "#...#", "####.", "#....", "#....", "#...."),
    "R": ("####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"),
    "S": (".####", "#....", "#....", ".###.", "....#", "....#", "####."),
    "T": ("#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."),
    "V": ("#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."),
    "Y": ("#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."),
}

LAYOUT = {   # low-res coordinates. Phone keeps y < 63 (under the clock) plain, and y > 667 (the dock) empty of props
    "phone": dict(desk=462, wall=66, booths=[30, 110, 190, 270], bw=30, booth_y=72, guards_y=88, barrier_y=122,
                  arms=[(26, 150), (170, 304)], lanes=[146 + 34 * k for k in range(9)], lane=(20, 310, 7),
                  passport=(55, 486, 110, 150, 2, 1, 2)),   # passport: x, y, page w, page h, stamp scale, visa scale, cover
    "desktop": dict(desk=226, wall=20, booths=[40, 150, 260, 370, 480], bw=40, booth_y=28, guards_y=42, barrier_y=60,
                    arms=[(40, 280), (320, 600)], lanes=[96 + 18 * k for k in range(7)], lane=(30, 610, 12),
                    passport=(156, 240, 164, 100, 3, 2, 3)),
}


def width(word, s): return (len(word) * 6 - 1) * s


def text(d, x, y, word, col, s, rng=None, knock=0.0):
    for i, ch in enumerate(word):
        for r, row in enumerate(GLYPHS[ch]):
            for c, on in enumerate(row):
                if on == "#" and not (rng and rng.random() < knock):
                    px, py = x + (i * 6 + c) * s, y + r * s
                    d.rectangle([px, py, px + s - 1, py + s - 1], fill=col)


def dotted_box(d, x0, y0, x1, y1, col):
    for x in range(x0, x1, 2): d.point((x, y0), col); d.point((x, y1), col)
    for y in range(y0, y1, 2): d.point((x0, y), col); d.point((x1, y), col)


def dashes(d, x0, x1, y, col):
    for x in range(x0, x1, 2): d.point((x, y), col)


def ground(d, w, desk):
    for y in range(desk):   # ordered dither between neighbouring greys: a flat, bleak fog that lightens toward the desk
        t = y / max(1, desk - 1) * (len(GREYS) - 1); i = min(int(t), len(GREYS) - 2); f = t - i
        for x in range(w):
            d.point((x, y), GREYS[i + 1] if f * 16 > BAYER[y % 4][x % 4] else GREYS[i])


def booth(d, x, y, w):
    d.rectangle([x, y, x + w, y + 10], fill=BLACK)
    d.line([(x - 1, y - 1), (x + w + 1, y - 1)], fill=OLIVE)
    d.rectangle([x + w // 4, y + 3, x + w * 3 // 4, y + 5], fill=CREAM)   # one lit window


def guard(d, x, y):
    d.rectangle([x, y, x + 2, y + 1], fill=BLACK)   # black cap
    d.rectangle([x, y + 2, x + 2, y + 5], fill=NAVY)


def person(d, x, y):   # a tiny black silhouette: head pixel over a 3x4 body
    d.point((x + 1, y), BLACK)
    d.rectangle([x, y + 1, x + 2, y + 4], fill=BLACK)


def barrier(d, x0, x1, y):
    for x in range(x0, x1):
        for dy in range(6): d.point((x, y + dy), BLACK if ((x + dy) // 3) % 2 else LIGHT_GREY)
    for x in (x0, x1): d.rectangle([x, y - 3, x + 1, y + 8], fill=DARK_OLIVE)


def stamp(d, x, y, s, rng):
    tw, p = width("APPROVED", s), 2 * s
    d.rectangle([x - p - s, y - p - s, x + tw + p + s - 1, y + 7 * s + p + s - 1], outline=STAMP, width=s)
    text(d, x, y, "APPROVED", STAMP, s, rng, .07)   # a few pixels knocked out, so it reads as ink


def passport(d, L, rng):
    px, py, pw, ph, s, vs, cover = L["passport"]
    d.rectangle([px - cover + 2, py - cover + 2, px + 2 * pw + cover + 2, py + ph + cover + 2], fill=BLACK)
    d.rectangle([px - cover, py - cover, px + 2 * pw + cover, py + ph + cover], fill=RED)
    d.rectangle([px, py, px + 2 * pw - 1, py + ph - 1], fill=CREAM)
    d.line([(px + pw, py), (px + pw, py + ph - 1)], fill=DARK_OLIVE)   # the spine
    ps = int(pw * .36); lx, ly = px + int(pw * .12), py + int(ph * .12); cx = lx + ps // 2   # left page: the photo
    d.rectangle([lx, ly, lx + ps, ly + ps], fill=LIGHT_GREY, outline=DARK_OLIVE)
    d.ellipse([int(cx - ps * .16), int(ly + ps * .18), int(cx + ps * .16), int(ly + ps * .5)], fill=BLACK)
    d.rectangle([int(cx - ps * .34), int(ly + ps * .56), int(cx + ps * .34), int(ly + ps * .94)], fill=BLACK)
    for k in range(3): dashes(d, lx, lx + int(pw * .76), ly + ps + int(ph * .08) + k * int(ph * .1), DARK_OLIVE)
    rc = px + pw + pw // 2   # right page: the dotted ENTRY VISA box, then the stamp
    bw, bx, by, bh = width("ENTRY VISA", vs) + 8 * vs, 0, py + int(ph * .12), int(ph * .42)
    bx = rc - bw // 2
    dotted_box(d, bx, by, bx + bw, by + bh, DARK_OLIVE)
    text(d, bx + 4 * vs, by + 4 * vs, "ENTRY VISA", DARK_OLIVE, vs)
    for k in range(3): dashes(d, bx + 4 * vs, bx + bw - 4 * vs, by + bh - 6 * vs - k * 5 * vs, DARK_OLIVE)
    stamp(d, rc - width("APPROVED", s) // 2, py + int(ph * .68), s, rng)


def desk(d, w, h, L, rng):
    top = L["desk"]; px, py, pw, ph = L["passport"][:4]
    d.rectangle([0, top, w, h], fill=DESK)
    cx, cy = px + pw, py + ph / 2   # a lamp pool on the desk under the passport
    d.ellipse([int(cx - pw), int(cy - ph * .55), int(cx + pw), int(cy + ph * .55)], fill="#2a221c")
    for y in range(top + 5, h, 9): d.line([(0, y), (w, y)], fill="#231c17")   # wood grain
    d.line([(0, top), (w, top)], fill=EDGE)
    passport(d, L, rng)


def papers(kind):
    W, H = SIZES[kind]; desktop = kind == "desktop"; scale = 8 if desktop else 4; w, h = W // scale, H // scale
    L = LAYOUT[kind]; img = Image.new("RGB", (w, h)); d = ImageDraw.Draw(img); rng = random.Random(41)
    ground(d, w, L["desk"])
    d.rectangle([0, L["wall"], w, L["wall"] + 4], fill=DARK_OLIVE); d.line([(0, L["wall"]), (w, L["wall"])], fill=OLIVE)
    for bx in L["booths"]:
        booth(d, bx, L["booth_y"], L["bw"]); guard(d, bx + L["bw"] // 2 - 1, L["guards_y"])
    for x0, x1 in L["arms"]: barrier(d, x0, x1, L["barrier_y"])
    x0, x1, sp = L["lane"]   # the queue: lanes of silhouettes, thinned at random so it breathes
    for y in L["lanes"]:
        for x in range(x0, x1, sp):
            if rng.random() < .8: person(d, x + rng.randrange(-1, 2), y + rng.randrange(-1, 2))
    desk(d, w, h, L, rng)
    f = 6 if desktop else 4
    vignette(img, f); d.rectangle([f, f, w - 1 - f, h - 1 - f], outline=OLIVE)   # redraw the frame in this palette
    img = dither(img.resize((w * 2, h * 2), Image.NEAREST), 6)   # dots at half a pixel, as in FEZ
    return grain(scanlines(img.resize((W, H), Image.NEAREST), scale))

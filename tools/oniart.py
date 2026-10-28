"""Oxygen Not Included wallpaper art for wallpapers.py: original pixel art (nothing from the install). A cutaway of the
asteroid: rock strata in blobby tiles, the dug-out base with a glowing printing arch, the colony's dupes as round-headed
silhouettes, oxygen bubbles rising, a water pocket and a CO2 pool sinking to the bottom. The live run's cycle and head
count come from games/oni/progress.jsonl. Drawn low, scaled up with NEAREST and finished like the FEZ and Papers art."""
import json, math, random
from pathlib import Path
from PIL import Image, ImageDraw
from fezart import SIZES, dither, grain, hexc, scanlines, vignette
from papersart import GLYPHS, text, width

GLYPHS.update({   # the letters this one needs on top of Papers' set
    "C": (".####", "#....", "#....", "#....", "#....", "#....", ".####"), "P": ("####.", "#...#", "#...#", "####.", "#....", "#....", "#...."),
    "H": ("#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"), "M": ("#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"),
    "W": ("#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"), "F": ("#####", "#....", "#....", "####.", "#....", "#....", "#...."),
    "/": ("....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."),
})
RUN = Path(__file__).resolve().parent.parent / "games" / "oni" / "progress.jsonl"
ROCK = {"sand": ("#b89a64", "#8a7048"), "dirt": ("#7a5434", "#563a22"), "algae": ("#5f8a3a", "#3e5e24"), "copper": ("#3f9a8a", "#c06a3a"),
        "granite": ("#7a7268", "#4e4842"), "coal": ("#2e2a2a", "#1a1717")}
BAND = ["granite", "sand", "dirt", "sand", "algae", "sand", "copper", "dirt", "sand", "coal", "granite"]
WARM, AIR, CO2, WATER, INK = hexc("#ffd27a"), hexc("#bfe8ff"), hexc("#3a3346"), hexc("#3b7fc4"), hexc("#0b0a0c")


def latest():
    try: rows = [json.loads(l) for l in RUN.read_text().splitlines() if l.strip()]
    except OSError: rows = []
    r = rows[-1] if rows else {"colony": 1, "cycle": 1, "dupes": 3}
    return r.get("colony", 1), r["cycle"], r["dupes"]


def rock(img, rng, top, bot):
    """Strata as blobby tiles with dark seams, the way the game draws its rock, each band one material."""
    d = ImageDraw.Draw(img); w = img.width; bh = (bot - top) / len(BAND)
    d.rectangle([0, top, w, bot], fill=hexc("#1a1410"))
    for y in range(int(top), int(bot), 7):
        for x in range(-4, w, 9):
            ox, oy, r = x + rng.randint(-2, 2) + (y // 7 % 2) * 4, y + rng.randint(-1, 1), rng.randint(4, 6)
            k = (y - top + .35 * x + 10 * math.sin(x / 23) + 5 * math.sin(x / 9 + y / 31)) / bh   # tilted, wavy strata: the Skewed Asteroid
            band = BAND[int(k) % len(BAND)]; light, dark = ROCK[band]
            c = hexc(dark if band == "copper" and rng.random() < .35 else light)
            d.ellipse([ox - r, oy - r + 1, ox + r, oy + r - 1], fill=c, outline=hexc(dark) if band != "copper" else hexc("#24584f"))
            if rng.random() < .25: d.point((ox - 1, oy - 2), tuple(min(255, v + 40) for v in c))


def dupe(d, x, y, s, rng, i=0):
    """A colonist drawn in the game's proportions: a head as wide as two bodies, ears, big dark eyes with a glint, the
    wide open grin, a small shirt with mitten hands, stubby boots, and one of three hairdos. Standing on y, centred on x."""
    skin = (hexc("#f2c79a"), hexc("#d79b6c"), hexc("#9a6440"))[i % 3]; shirt = (hexc("#4a8ad0"), hexc("#d05a4a"), hexc("#e0b040"))[i % 3]
    hair = (hexc("#1e1a24"), hexc("#e08ab8"), hexc("#6a3e22"))[i % 3]; o = INK
    hw, hh = 11 * s, 9 * s; hy = y - 12 * s - hh   # head centre
    d.rectangle([x - 2 * s, y - 3 * s, x - s, y], fill=o); d.rectangle([x + s, y - 3 * s, x + 2 * s, y], fill=o)   # boots
    d.rounded_rectangle([x - 5 * s, y - 11 * s, x + 5 * s, y - 3 * s], radius=2 * s, fill=shirt, outline=o)   # shirt
    d.line([(x - 2 * s, y - 11 * s), (x, y - 9 * s), (x + 2 * s, y - 11 * s)], fill=o)   # collar
    for sx in (-1, 1): d.ellipse([x + sx * 6 * s - 2 * s, y - 8 * s, x + sx * 6 * s + 2 * s, y - 4 * s], fill=skin, outline=o)   # mitten hands
    for sx in (-1, 1): d.ellipse([x + sx * hw - 3 * s, hy - s, x + sx * hw + 2 * s - (sx < 0) * -1, hy + 4 * s], fill=skin, outline=o)   # ears
    d.ellipse([x - hw, hy - hh, x + hw, hy + hh], fill=skin, outline=o)
    if i % 3 == 0:   # spiky black
        d.chord([x - hw, hy - hh - 2 * s, x + hw, hy + hh * .3], 180, 360, fill=hair, outline=o)
        for k in range(-3, 4): d.polygon([(x + k * 3 * s - 2 * s, hy - hh + s), (x + k * 3 * s, hy - hh - 4 * s), (x + k * 3 * s + 2 * s, hy - hh + s)], fill=hair)
    elif i % 3 == 1:   # a pink cloud of curls
        for a in range(0, 360, 30):
            cxh, cyh = x + math.cos(math.radians(a)) * hw * .75, hy - hh * .45 + math.sin(math.radians(a)) * hh * .45
            if cyh < hy - hh * .35: d.ellipse([cxh - 4 * s, cyh - 4 * s, cxh + 4 * s, cyh + 4 * s], fill=hair, outline=o)   # curls stay above the eyes
        d.chord([x - hw + s, hy - hh, x + hw - s, hy + hh * .1], 180, 360, fill=hair)
    else:   # a brown cap of hair with a bun
        d.ellipse([x - 3 * s, hy - hh - 5 * s, x + 3 * s, hy - hh + s], fill=hair, outline=o)
        d.chord([x - hw, hy - hh - s, x + hw, hy + hh * .2], 180, 360, fill=hair, outline=o)
    for sx in (-1, 1):   # eyes: dark ovals with a glint
        ex = x + sx * 4 * s; d.ellipse([ex - 1.5 * s, hy - 1.5 * s, ex + 1.5 * s, hy + 2.5 * s], fill=o); d.point((ex - .5 * s, hy - .5 * s), (255, 255, 255))
    d.arc([x - s, hy + s, x + s, hy + 3 * s], 200, 340, fill=o)   # nose
    d.chord([x - 4 * s, hy + 2 * s, x + 4 * s, hy + 8 * s], 0, 180, fill=hexc("#5a1a22"), outline=o)   # the grin
    d.chord([x - 2 * s, hy + 5 * s, x + 2 * s, hy + 8 * s], 0, 180, fill=hexc("#e06a7a"))   # tongue
    d.line([(x - 3 * s, hy + 5 * s), (x + 3 * s, hy + 5 * s)], fill=(250, 246, 236))   # teeth


def base(img, rng, x0, y0, x1, y1, alive):
    """The dug room: warm air, a floor of tiles, a ladder, the printing arch glowing, the dupes and oxygen rising."""
    d = ImageDraw.Draw(img)
    for y in range(y0, y1):   # air warms toward the lit floor
        t = (y - y0) / (y1 - y0); d.line([(x0, y), (x1, y)], fill=tuple(int(a * (1 - t) + b * t) for a, b in zip(hexc("#2b3a44"), hexc("#5a5040"))))
    d.rectangle([x0, y1, x1, y1 + 4], fill=hexc("#cfc6b0")); d.line([(x0, y1), (x1, y1)], fill=hexc("#f0e8d4"))
    for x in range(x0, x1, 8): d.line([(x, y1 + 1), (x, y1 + 4)], fill=hexc("#9a917c"))
    lx = x0 + (x1 - x0) * 3 // 4
    for y in range(y0 - 30, y1, 4): d.line([(lx - 3, y), (lx + 3, y)], fill=hexc("#a8744a"))
    d.line([(lx - 3, y0 - 30), (lx - 3, y1)], fill=hexc("#6e4a2e")); d.line([(lx + 3, y0 - 30), (lx + 3, y1)], fill=hexc("#6e4a2e"))
    cx = (x0 + x1) // 2; r = (y1 - y0) * 2 // 5; gy = y1 - r
    px = img.load()
    for y in range(y0, y1):   # light spilling out of the printing arch
        for x in range(x0, x1):
            q = max(0, 1 - math.hypot((x - cx) / (2.6 * r), (y - gy) / (1.5 * r))) ** 1.6
            if q: px[x, y] = tuple(min(255, int(c + (wc - c) * q * .8)) for c, wc in zip(px[x, y], WARM))
    d = ImageDraw.Draw(img)
    hole = Image.new("L", img.size, 0); hd = ImageDraw.Draw(hole)   # the opening: white-hot at the core, warm at the rim
    hd.rectangle([cx - r + 4, gy, cx + r - 4, y1], fill=255); hd.ellipse([cx - r + 4, gy - r + 4, cx + r - 4, gy + r - 4], fill=255); hp = hole.load()
    for y in range(int(gy - r), y1 + 1):
        for x in range(cx - r, cx + r + 1):
            if hp[x, y]: q = min(1, math.hypot((x - cx) / r, (y - (gy + r * .3)) / (r * 1.3))); px[x, y] = tuple(int(a + (b - a) * q ** 1.4) for a, b in zip((255, 252, 236), hexc("#f2b85a")))
    d = ImageDraw.Draw(img)
    for t in (0, 1):   # two pillars and the arch over them
        d.rectangle([cx - r - 3 + t * (2 * r - 1), gy, cx - r + 4 + t * (2 * r - 1), y1], fill=hexc("#d8ceb4"), outline=INK)
    d.arc([cx - r - 3, gy - r - 3, cx + r + 3, gy + r + 3], 180, 360, fill=hexc("#d8ceb4"), width=7); d.arc([cx - r - 3, gy - r - 3, cx + r + 3, gy + r + 3], 180, 360, fill=INK, width=1)
    d.ellipse([cx - 6, gy - r - 9, cx + 6, gy - r + 3], fill=WARM, outline=INK)
    sz = 1.6 if (y1 - y0) > 90 else 1   # about two thirds of the room, like the game's colonists
    furnish(d, x0, x1, y1, cx, r, 2)
    spots = [cx - r - 20 * sz / 1.6, cx + r + 22 * sz / 1.6, x1 - 18 * sz / 1.6, x0 + 18]   # in front of the cot, by the desk, past the planter
    for i in range(alive): dupe(d, spots[i % len(spots)], y1, sz, rng, i)
    for i in range(12):   # oxygen rising off the diffuser by the planter, wobbling as it goes
        t = i / 12; bx = x1 - 44 + 5 * math.sin(i * 1.7); by = y1 - 26 - t * (y1 - y0 - 36); rr = 2 + (i % 3 == 0)
        d.ellipse([bx - rr, by - rr, bx + rr, by + rr], outline=AIR); d.point((bx - rr // 2, by - rr // 2), (255, 255, 255))
    d.rectangle([x0 - 2, y0 - 6, x1 + 2, y0 - 1], fill=hexc("#cfc6b0"), outline=INK)   # a tiled ceiling and dark rims, so the room is dug, not pasted
    for x in range(x0, x1, 8): d.line([(x, y0 - 5), (x, y0 - 2)], fill=hexc("#9a917c"))
    d.line([(x0 - 1, y0), (x0 - 1, y1)], fill=INK, width=2); d.line([(x1 + 1, y0), (x1 + 1, y1)], fill=INK, width=2)


def furnish(d, x0, x1, y1, cx, r, s):
    """A cot, the research desk with its screen, an outhouse and a planter of mealwood, the colony's first rooms."""
    ox = x0 + 10 * s   # the outhouse, a little hut with a moon in the door
    d.rectangle([ox, y1 - 14 * s, ox + 9 * s, y1 - 1], fill=hexc("#8a6a48"), outline=INK); d.polygon([(ox - s, y1 - 14 * s), (ox + 4 * s, y1 - 18 * s), (ox + 10 * s, y1 - 14 * s)], fill=hexc("#5a4430"), outline=INK)
    d.arc([ox + 3 * s, y1 - 11 * s, ox + 6 * s, y1 - 8 * s], 300, 120, fill=WARM)
    bx = ox + 16 * s   # a cot: frame, mattress, a blanket in the colony red
    d.rectangle([bx, y1 - 5 * s, bx + 16 * s, y1 - 3 * s], fill=hexc("#d8d0bc"), outline=INK); d.rectangle([bx + 5 * s, y1 - 6 * s, bx + 16 * s, y1 - 4 * s], fill=hexc("#b8443a"))
    d.line([(bx, y1 - 3 * s), (bx, y1)], fill=INK); d.line([(bx + 16 * s, y1 - 3 * s), (bx + 16 * s, y1)], fill=INK)
    rx = cx + r + 12 * s   # the research station: a desk, a glowing screen, a flask
    d.rectangle([rx, y1 - 7 * s, rx + 16 * s, y1 - 5 * s], fill=hexc("#7a5a3a"), outline=INK); d.line([(rx + s, y1 - 5 * s), (rx + s, y1)], fill=INK); d.line([(rx + 15 * s, y1 - 5 * s), (rx + 15 * s, y1)], fill=INK)
    d.rectangle([rx + 3 * s, y1 - 15 * s, rx + 11 * s, y1 - 8 * s], fill=hexc("#7fe0c0"), outline=INK); d.line([(rx + 5 * s, y1 - 12 * s), (rx + 9 * s, y1 - 12 * s)], fill=hexc("#2a6a5a"))
    d.ellipse([rx + 12 * s, y1 - 10 * s, rx + 15 * s, y1 - 7 * s], fill=hexc("#c86ad0"), outline=INK)
    px = x1 - 26 * s   # a planter box of mealwood
    d.rectangle([px, y1 - 4 * s, px + 12 * s, y1 - 1], fill=hexc("#6a4a30"), outline=INK)
    for i in range(4):
        lx = px + 2 * s + i * 3 * s; d.line([(lx, y1 - 4 * s), (lx - s, y1 - 9 * s - (i % 2) * 2 * s)], fill=hexc("#7ac04a"), width=s)
        d.ellipse([lx - 2 * s, y1 - 11 * s - (i % 2) * 2 * s, lx + s, y1 - 8 * s - (i % 2) * 2 * s], fill=hexc("#a8d86a"), outline=hexc("#3e6a24"))


def light(img, box, top, warm=.55):
    """The rock falls off into the dark away from the base, and the rooms spill warm light onto what is near them."""
    x0, y0, x1, y1 = box; px = img.load(); R = 150
    for y in range(int(top), img.height):
        for x in range(img.width):
            if x0 <= x <= x1 and y0 <= y <= y1 + 4: continue
            dx = max(x0 - x, 0, x - x1); dy = max(y0 - y, 0, y - y1); q = max(0, 1 - math.hypot(dx, dy * 1.2) / R)
            f = .3 + .7 * q ** 1.3; c = px[x, y]
            px[x, y] = tuple(min(255, int(v * f + (wv - v) * f * q * q * warm * .35)) for v, wv in zip(c, WARM))


def pocket(d, x, y, w, h, rng):
    """A cave of water under the base: dark rock rim, the pool filling the lower part, light on its surface."""
    d.ellipse([x - 3, y - 3, x + w + 3, y + h + 3], fill=hexc("#120e0c")); d.ellipse([x, y, x + w, y + h], fill=hexc("#1e2a33"))
    sy = y + h * .35
    d.chord([x, y, x + w, y + h], 0, 180, fill=WATER); d.rectangle([x + 3, sy, x + w - 3, y + h / 2], fill=WATER)
    d.line([(x + 4, sy), (x + w - 4, sy)], fill=AIR); d.line([(x + w * .25, sy + 3), (x + w * .55, sy + 3)], fill=hexc("#7ab8e8"))
    for _ in range(5): bx, by = rng.uniform(x + 8, x + w - 8), rng.uniform(sy + 6, y + h - 6); d.point((bx, by), hexc("#9ad0f8"))


def geode(d, cx, cy, rng):
    """The world's geode trait: a cracked cavity of violet crystal catching the light."""
    d.ellipse([cx - 26, cy - 18, cx + 26, cy + 18], fill=hexc("#140e18"), outline=INK); d.ellipse([cx - 22, cy - 15, cx + 22, cy + 15], fill=hexc("#2a1c38"))
    for _ in range(16):
        a = rng.uniform(0, 6.28); r0 = rng.uniform(14, 20); bx, by = cx + r0 * math.cos(a) * 1.1, cy + r0 * math.sin(a) * .72
        tx, ty = cx + (bx - cx) * .35, cy + (by - cy) * .35; hw = rng.uniform(2.5, 4)
        nx, ny = -(ty - by), tx - bx; n = math.hypot(nx, ny) or 1; nx, ny = nx / n * hw, ny / n * hw
        c = rng.choice([hexc("#b07ae8"), hexc("#8a5ad0"), hexc("#d8b0ff")])
        d.polygon([(bx + nx, by + ny), (tx, ty), (bx - nx, by - ny)], fill=c, outline=hexc("#4a2a6a")); d.line([(bx + nx * .4, by + ny * .4), (tx, ty)], fill=hexc("#f0e0ff"))


def oni(kind):
    W, H = SIZES[kind]; desktop = kind == "desktop"; scale = 8 if desktop else 4; w, h = W // scale, H // scale
    rng = random.Random(457140); colony, cycle, alive = latest()
    img = Image.new("RGB", (w, h), hexc("#05060c")); d = ImageDraw.Draw(img)
    sky = 70 if not desktop else 40   # the phone clock sits over open space
    for _ in range(140 if not desktop else 260): d.point((rng.randrange(w), rng.randrange(sky + 30)), rng.choice([hexc("#8a9ab8"), hexc("#d8e4ff"), hexc("#4a5470")]))
    rock(img, rng, sky + 26, h)
    d = ImageDraw.Draw(img); edge = [(x, sky + 26 + 6 * math.sin(x / 17) + 3 * math.sin(x / 5.3)) for x in range(0, w + 1, 2)]
    d.polygon([(0, 0), *edge, (w, 0)], fill=hexc("#05060c")); d.line(edge, fill=hexc("#6a5a44"))
    for _ in range(90 if not desktop else 160): d.point((rng.randrange(w), rng.randrange(sky + 20)), rng.choice([hexc("#8a9ab8"), hexc("#d8e4ff")]))
    if desktop: bx0, by0, bx1, by1 = w // 2 - 170, h // 2 - 40, w // 2 + 170, h // 2 + 40
    else: bx0, by0, bx1, by1 = 14, h // 2 - 110, w - 14, h // 2 + 10
    pocket(ImageDraw.Draw(img), bx1 - (96 if desktop else 78), by1 + 34, 70 if desktop else 60, 40, rng)
    light(img, (bx0, by0, bx1, by1), sky + 20)
    gx, gy = (w // 4, h - 120) if not desktop else (w - 120, h - 70); px = img.load()
    for y in range(gy - 46, gy + 46):   # its own violet glow, since the base light never reaches this deep
        for x in range(max(0, gx - 64), min(w, gx + 64)):
            q = max(0, 1 - math.hypot((x - gx) / 60, (y - gy) / 42)) ** 2; px[x, y] = tuple(min(255, int(c + (v - c) * q * .75)) for c, v in zip(px[x, y], hexc("#9a6ad8")))
    geode(ImageDraw.Draw(img), gx, gy, rng)
    base(img, rng, bx0, by0, bx1, by1, alive); d = ImageDraw.Draw(img)
    for y in range(h - 70, h):   # CO2 pools at the bottom, heavier than air
        t = (y - (h - 70)) / 70
        for x in range(w):
            r, g, b = img.getpixel((x, y)); img.putpixel((x, y), tuple(int(c * (1 - .55 * t) + q * .55 * t) for c, q in zip((r, g, b), CO2)))
    d = ImageDraw.Draw(img)
    big, small = f"CYCLE {cycle}", f"COLONY {colony}  {alive} ALIVE"; ty = by1 + (112 if not desktop else 64)
    for word, sc, col, y in ((big, 4, WARM, ty), (small, 2, hexc("#f0ecd8"), ty + 40)):   # one big number, one quiet line
        tx = (w - width(word, sc)) // 2
        for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1), (2, 2)): text(d, tx + ox, y + oy, word, INK, sc)
        text(d, tx, y, word, col, sc)
    f = 6 if desktop else 4
    vignette(img, f); ImageDraw.Draw(img).rectangle([f, f, w - 1 - f, h - 1 - f], outline=hexc("#6a5a44"))
    img = dither(img.resize((w * 2, h * 2), Image.NEAREST), 6)
    return grain(scanlines(img.resize((W, H), Image.NEAREST), scale))


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "brand" / "wallpapers"
    for k in SIZES: oni(k).save(out / f"oni-{k}.png", optimize=True)
    print("ok")

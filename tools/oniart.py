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


def dupe(d, x, y, s, rng):
    """A round-headed little colonist, arms out, standing on y."""
    skin, suit = rng.choice([hexc("#f2c79a"), hexc("#c98e62"), hexc("#8a5a3a")]), rng.choice([hexc("#d04a3a"), hexc("#3a6ad0"), hexc("#d0a03a")])
    d.rectangle([x - 2 * s, y - 5 * s, x + 2 * s, y - 1], fill=suit); d.rectangle([x - 2 * s, y - s, x - s, y], fill=INK); d.rectangle([x + s, y - s, x + 2 * s, y], fill=INK)
    d.ellipse([x - 4 * s, y - 13 * s, x + 4 * s, y - 5 * s], fill=skin, outline=INK)
    d.point((x - 2 * s, y - 9 * s), INK); d.point((x + s, y - 9 * s), INK); d.line([(x - s, y - 7 * s), (x + s, y - 7 * s)], fill=INK)


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
    d.rectangle([cx - r + 4, gy, cx + r - 4, y1], fill=(255, 244, 210)); d.ellipse([cx - r + 4, gy - r + 4, cx + r - 4, gy + r - 4], fill=(255, 244, 210))
    for t in (0, 1):   # two pillars and the arch over them
        d.rectangle([cx - r - 3 + t * (2 * r - 1), gy, cx - r + 4 + t * (2 * r - 1), y1], fill=hexc("#d8ceb4"), outline=INK)
    d.arc([cx - r - 3, gy - r - 3, cx + r + 3, gy + r + 3], 180, 360, fill=hexc("#d8ceb4"), width=7); d.arc([cx - r - 3, gy - r - 3, cx + r + 3, gy + r + 3], 180, 360, fill=INK, width=1)
    d.ellipse([cx - 6, gy - r - 9, cx + 6, gy - r + 3], fill=WARM, outline=INK)
    sz = 2 if (y1 - y0) > 90 else 1
    for i in range(alive): dupe(d, (cx - r - 22 - i * 26) if i % 2 == 0 else (cx + r + 22 + (i - 1) * 26), y1, sz, rng)
    for _ in range(26):   # oxygen bubbles drifting up from the diffuser end of the room
        bx, by = rng.randint(x0 + 4, x1 - 4), rng.randint(y0 + 2, y1 - 6); rr = rng.choice([1, 1, 2])
        d.ellipse([bx - rr, by - rr, bx + rr, by + rr], outline=AIR)


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
    base(img, rng, bx0, by0, bx1, by1, alive); d = ImageDraw.Draw(img)
    px0, py0 = bx1 - (90 if desktop else 70), by1 + 30   # a water pocket below the base, its surface catching the light
    d.ellipse([px0, py0, px0 + (70 if desktop else 52), py0 + 44], fill=WATER, outline=hexc("#1c3a5c")); d.line([(px0 + 8, py0 + 10), (px0 + 44, py0 + 10)], fill=AIR)
    for y in range(h - 70, h):   # CO2 pools at the bottom, heavier than air
        t = (y - (h - 70)) / 70
        for x in range(w):
            r, g, b = img.getpixel((x, y)); img.putpixel((x, y), tuple(int(c * (1 - .55 * t) + q * .55 * t) for c, q in zip((r, g, b), CO2)))
    d = ImageDraw.Draw(img); s = 2
    lines = [f"COLONY {colony}", f"CYCLE {cycle}", f"{alive} ALIVE"]
    ty = by1 + (110 if not desktop else 60)
    for i, line in enumerate(lines):
        tx = (w - width(line, s)) // 2; y = ty + i * 9 * s
        text(d, tx + 1, y + 1, line, INK, s); text(d, tx, y, line, WARM if i == 1 else hexc("#f0ecd8"), s)
    f = 6 if desktop else 4
    vignette(img, f); ImageDraw.Draw(img).rectangle([f, f, w - 1 - f, h - 1 - f], outline=hexc("#6a5a44"))
    img = dither(img.resize((w * 2, h * 2), Image.NEAREST), 6)
    return grain(scanlines(img.resize((W, H), Image.NEAREST), scale))


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "brand" / "wallpapers"
    for k in SIZES: oni(k).save(out / f"oni-{k}.png", optimize=True)
    print("ok")

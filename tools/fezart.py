"""FEZ wallpaper art for wallpapers.py: original pixel art in the game's spirit (no sprites from the install),
a floating island at night, the golden cube and its eight bits, ordered-dithered with scanlines and grain."""
import math, random
from PIL import Image, ImageChops, ImageDraw

SIZES = {"desktop": (5120, 2880), "phone": (1320, 2868)}


def hexc(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

SKY = [hexc(c) for c in ("#0b1322", "#0f192c", "#141f33", "#1a2740", "#22335a")]
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
MAT = {   # top, left face, right face, edge highlight, speckle
    "grass": ("#5fbf4a", "#5d6b85", "#46526a", "#8ee06b", "#4a9e3a"),
    "rock": ("#8796ae", "#5d6b85", "#46526a", "#a9b6cc", "#4f5c74"),
    "deep": ("#5d6b85", "#46526a", "#353f55", "#7a879c", "#2e374a"),
    "wall": ("#d6dee8", "#a9b6c8", "#8592a6", "#eef3f8", "#c3ccd8"),
    "roof": ("#0074d9", "#0063ba", "#004a8c", "#6cb6ff", "#0068c4"),
    "trunk": ("#7a5a46", "#6b4a3a", "#563a2e", "#8c6b55", "#5e4032"),
    "leaf": ("#4fb04a", "#3a8a3a", "#2b6b2e", "#7cd66b", "#3f9a3c"),
    "gold": ("#ffe27a", "#f2b630", "#c98a12", "#fff3b8", "#f7c948"),
    "far": ("#3a5280", "#2a3b5c", "#1f2d48", "#4a6494", "#33486f"),
}
LIP = {"grass": ("#3e8e3a", "#2e6b2e")}   # grass hangs over the side faces


def sky(d, w, h):
    for y in range(h):
        t = y / (h - 1) * (len(SKY) - 1); i = min(int(t), len(SKY) - 2); f = t - i
        for x in range(w):   # ordered dither between neighbouring bands: flat colours, no smooth gradient
            d.point((x, y), SKY[i + 1] if f * 16 > BAYER[y % 4][x % 4] else SKY[i])


def stars(d, w, h, rng, n, avoid):
    for _ in range(n):
        x, y = rng.randrange(w), rng.randrange(int(h * .7))
        if any(abs(x - ax) < ar and abs(y - ay) < ar for ax, ay, ar in avoid): continue
        d.point((x, y), rng.choice([(255, 255, 255), (214, 232, 251), (127, 189, 242), (90, 120, 170), (90, 120, 170)]))
    for _ in range(n // 30):   # a few four-point twinkles
        x, y = rng.randrange(2, w - 2), rng.randrange(2, int(h * .55))
        if any(abs(x - ax) < ar and abs(y - ay) < ar for ax, ay, ar in avoid): continue
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)): d.point((x + dx, y + dy), (255, 255, 255) if (dx, dy) == (0, 0) else (127, 189, 242))


def moon(d, cx, cy, r):
    for y in range(-r - 6, r + 7):
        for x in range(-r - 6, r + 7):
            q = math.hypot(x, y)
            if q <= r:
                shade = (x + y * .4) / r   # lit from the upper left
                c = "#eef3f8" if shade < .2 else ("#c3d2e6" if shade < .55 or (shade < .7 and BAYER[y % 4][x % 4] < 8) else "#93a8c6")
                d.point((cx + x, cy + y), hexc(c))
            elif q <= r + 5 and BAYER[y % 4][x % 4] < (3 if q > r + 2 else 6):
                d.point((cx + x, cy + y), hexc("#2c4370"))
    for ox, oy, cr in ((-6, -4, 4), (5, 6, 3), (8, -8, 2), (-2, 9, 2)):   # craters
        d.ellipse([cx + ox - cr, cy + oy - cr, cx + ox + cr, cy + oy + cr], fill=hexc("#b3c4dc"))


def cube(d, x, y, mat, s, edges, rng, lip):
    """One isometric voxel, top corner at (x+s/2, y): a 2:1 diamond top over two shaded faces.
    Only silhouette edges get a highlight, so a mass reads as one shape, not a grid of blocks."""
    t, l, r, hi, sp = (hexc(c) for c in MAT[mat]); h = s // 2; q = s // 4
    L = [(x, y + q), (x + h - 1, y + h), (x + h - 1, y + s), (x, y + s - q)]
    R = [(x + h, y + h), (x + s - 1, y + q), (x + s - 1, y + s - q), (x + h, y + s)]
    d.polygon(L, fill=l); d.polygon(R, fill=r)
    if lip:   # a grass lip over the top of each side face
        ll, lr = (hexc(c) for c in LIP[mat]); k = max(2, s // 6)
        d.polygon([(x, y + q), (x + h - 1, y + h), (x + h - 1, y + h + k), (x, y + q + k)], fill=ll)
        d.polygon([(x + h, y + h), (x + s - 1, y + q), (x + s - 1, y + q + k), (x + h, y + h + k)], fill=lr)
        for _ in range(2):   # ragged drips
            dx = rng.randrange(h); d.line([(x + dx, y + q + k + dx // 2), (x + dx, y + q + k + dx // 2 + rng.randrange(1, 3))], fill=ll)
    d.polygon([(x, y + q), (x + h, y), (x + s - 1, y + q), (x + h, y + h)], fill=t)
    if s >= 12:
        for _ in range(3):   # speckle texture on the top face
            u, v = rng.randrange(2, s - 2), rng.randrange(1, h - 1)
            if abs(u - h) / h + abs(v - q) / q < .8: d.point((x + u, y + v), sp)
    if "ul" in edges: d.line([(x, y + q), (x + h - 1, y)], fill=hi)
    if "ur" in edges: d.line([(x + h, y), (x + s - 1, y + q)], fill=hi)


def voxels(d, vox, ox, oy, s, seed=1):
    rng = random.Random(seed)
    for (i, j, k), mat in sorted(vox.items(), key=lambda kv: (kv[0][0] + kv[0][1], kv[0][2])):
        up = (i, j, k + 1) in vox
        edges = set() if up else {e for e, n in (("ul", (i - 1, j, k)), ("ur", (i, j - 1, k))) if n not in vox and (n[0], n[1], k + 1) not in vox}
        cube(d, ox + (i - j) * s // 2, oy + (i + j) * s // 4 - k * s // 2, mat, s, edges, rng, mat in LIP and not up)


def island(seed, r=6.0, top=6, house=True):
    rng = random.Random(seed); vox = {}
    for i in range(-9, 10):
        for j in range(-9, 10):
            dist = math.hypot(i, j) + rng.uniform(-.5, .5)
            if dist > r: continue
            depth = int((r - dist) * 1.4) + 1   # floating rock tapers to a point below
            for k in range(top - depth, top): vox[(i, j, k)] = "deep" if k < top - 3 else "rock"
            vox[(i, j, top)] = "grass"
    if house:
        for i in range(-4, -1):
            for j in range(-4, -1):
                for k in range(top + 1, top + 4): vox[(i, j, k)] = "wall"
                vox[(i, j, top + 4)] = "roof"
        vox[(-3, -3, top + 5)] = "roof"
        for k in range(top + 1, top + 3): vox[(3, -3, k)] = "trunk"
        for i in range(2, 5):
            for j in range(-4, -1):
                for k in range(top + 3, top + 6): vox[(i, j, k)] = "leaf"
        vox[(3, -3, top + 6)] = "leaf"
    return vox


def at(ox, oy, i, j, k, s): return ox + (i - j) * s // 2, oy + (i + j) * s // 4 - k * s // 2


def door(d, ox, oy, top, s):   # the doorway on the house's right face, FEZ style
    x, y = at(ox, oy, -2, -3, top + 1, s)
    x += s // 2 + 2; y += s // 2 + 2
    for n in range(9):
        d.line([(x, y + n), (x + 4, y + n - 2)], fill=hexc("#0b1322"))
    d.line([(x - 1, y - 1), (x + 5, y - 4)], fill=hexc("#eef3f8"))


def fez_hat(d, x, y):
    red, dark, tassel = hexc("#d62839"), hexc("#a11d2b"), hexc("#1b2236")
    d.polygon([(x, y + 7), (x + 1, y), (x + 7, y), (x + 8, y + 7)], fill=red)
    d.line([(x + 6, y), (x + 7, y + 7)], fill=dark); d.line([(x, y + 7), (x + 8, y + 7)], fill=dark)
    d.line([(x + 4, y), (x + 4, y - 1)], fill=tassel); d.line([(x + 4, y - 1), (x + 8, y + 3)], fill=tassel)


def waterfall(d, x, y0, y1, rng):
    for y in range(y0, y1):
        f = (y - y0) / max(1, y1 - y0); wide = 5 + int(f * 3)
        for dx in range(wide):
            edge = dx in (0, wide - 1)
            if BAYER[y % 4][(x + dx) % 4] < 16 * (1 - f * .6) * (.5 if edge else 1):
                d.point((x + dx - int(f * 1.5), y), hexc("#4a7fc1" if edge else ("#a9d4f7" if (dx + y // 3) % 3 == 0 else "#7fbdf2")))
        if rng.random() < .3: d.point((x + rng.randrange(-2, wide + 2), y), hexc("#eef3f8"))
    for _ in range(60):   # spray where it meets the clouds
        a = rng.uniform(math.pi, 2 * math.pi); r = rng.uniform(2, 14)
        d.point((x + 3 + r * math.cos(a) * 1.4, y1 - 2 + r * math.sin(a) * .6), hexc(rng.choice(["#eef3f8", "#a9d4f7"])))


def vines(d, vox, ox, oy, s, rng, n=10):
    edge = [p for p in vox if vox[p] == "grass" and (p[0], p[1] + 1, p[2]) not in vox]
    for i, j, k in rng.sample(edge, min(n, len(edge))):
        x, y = at(ox, oy, i, j, k, s); x += rng.randrange(2, s // 2 - 1); y += s // 4 + 3 + (x % (s // 2)) // 2
        for m in range(rng.randrange(4, 12)):
            d.point((x + (1 if m % 5 == 3 else 0), y + m), hexc("#3e8e3a" if m % 3 else "#5fbf4a"))


def gold_cube(d, cx, cy, s, t, rng):
    for r in range(s + 14, s - 2, -3):   # dithered halo rings
        for a in range(0, 360, 3):
            px, py = cx + r * math.cos(math.radians(a)), cy + r * .85 * math.sin(math.radians(a))
            if (int(px) * 3 + int(py)) % (2 if r < s + 4 else 4) == 0: d.point((px, py), hexc("#fff3b8" if r < s + 4 else "#c98a12"))
    cube(d, cx - s // 2, cy - s // 2, "gold", s, {"ul", "ur"}, rng, False)
    q = s // 4; x0, y0 = cx - s // 2, cy - s // 2
    for a, b in (((x0 + q, y0 + q // 2), (x0 + 3 * q, y0 + 3 * q // 2)), ((x0 + 3 * q, y0 + q // 2), (x0 + q, y0 + 3 * q // 2))):
        d.line([a, b], fill=hexc("#f2b630"))   # a FEZ cube is assembled from parts: seams on the top
    d.line([(x0 + s // 4, y0 + 3 * s // 8 + 2), (x0 + s // 4, y0 + 7 * s // 8 - 2)], fill=hexc("#c98a12"))
    d.line([(x0 + 3 * s // 4, y0 + 3 * s // 8 + 2), (x0 + 3 * s // 4, y0 + 7 * s // 8 - 2)], fill=hexc("#a8720a"))
    for n in range(8):   # the eight bits in orbit
        a = t + n * math.pi / 4
        cube(d, int(cx + (s + 26) * math.cos(a)) - 4, int(cy + (s + 26) * .5 * math.sin(a)) - 4, "gold", 8, {"ul", "ur"}, rng, False)


def cloud_sea(d, w, h, rng, y0):
    layers = [("#1a2740", "#22335a"), ("#22335a", "#2c4370"), ("#2c4370", "#3a5788"), ("#3a5788", "#5373a8")]
    for n, (body, rim) in enumerate(layers):
        base = y0 + n * (h - y0) // 5
        x = -rng.randrange(20)
        while x < w + 20:
            r = rng.randrange(7, 16) + n * 2
            cy = base - rng.randrange(0, 6)
            d.ellipse([x - r, cy - r, x + r, cy + r], fill=hexc(rim))
            d.ellipse([x - r + 1, cy - r + 2, x + r - 1, cy + r + 2], fill=hexc(body))
            x += rng.randrange(r, 2 * r)
        d.rectangle([0, base + 2, w, h], fill=hexc(body))


def glow(d, img, cx, cy, r, rings):
    """A dithered halo on the dark sky only, so it reads as light without a smooth gradient."""
    px = img.load()
    for y in range(max(0, cy - r), min(img.height, cy + r)):
        for x in range(max(0, cx - r), min(img.width, cx + r)):
            q = math.hypot(x - cx, y - cy) / r
            if q >= 1 or sum(px[x, y]) > 140: continue
            for edge, col, dens in rings:
                if q < edge and BAYER[y % 4][x % 4] < 16 * dens * (1 - q / edge): d.point((x, y), hexc(col)); break


def vignette(img, frame):
    """Darken the corners in dithered steps and draw a thin frame, the Hermes/Nous way."""
    px = img.load(); w, h = img.size
    for y in range(h):
        for x in range(w):
            e = max(0, (math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2)) - .7) / .55)
            if e and BAYER[y % 4][x % 4] < 16 * min(1, e) * .8:
                r, g, b = px[x, y]; px[x, y] = (r * 3 // 5, g * 3 // 5, b * 3 // 5)
    ImageDraw.Draw(img).rectangle([frame, frame, w - 1 - frame, h - 1 - frame], outline=hexc("#3a5788"))


def scanlines(img, period, dark=.8):
    W, H = img.size
    col = Image.new("L", (1, H)); col.putdata([int(255 * dark) if y % period >= period * 5 // 8 else 255 for y in range(H)])
    m = col.resize((W, H), Image.NEAREST)
    return ImageChops.multiply(img, Image.merge("RGB", (m, m, m)))


def grain(img, block=2, amount=.16):
    W, H = img.size
    n = Image.effect_noise((W // block, H // block), 48).resize((W, H), Image.NEAREST)
    return Image.blend(img, ImageChops.overlay(img, Image.merge("RGB", (n, n, n))), amount)


BAYER8 = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
          [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
          [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]]


def dither(img, levels=5):
    """Ordered (Bayer 8x8) dither to a few levels per channel: every gradient and flat tint breaks into a dot pattern."""
    img = img.copy(); px = img.load(); step = 255 / (levels - 1)
    lut = [[min(255, int(int(v / step + (t + .5) / 64) * step)) for v in range(256)] for t in range(64)]
    for y in range(img.height):
        row = BAYER8[y % 8]
        for x in range(img.width):
            l = lut[row[x % 8]]; r, g, b = px[x, y]; px[x, y] = (l[r], l[g], l[b])
    return img


def fez(kind):
    W, H = SIZES[kind]; scale = 8 if kind == "desktop" else 4; w, h = W // scale, H // scale
    img = Image.new("RGB", (w, h)); d = ImageDraw.Draw(img); rng = random.Random(32)
    sky(d, w, h)
    if kind == "desktop":
        mo, main, gold, sea, far = (96, 64, 22), (420, 196), (250, 104), 300, [((118, 212), 3.0, 8), ((560, 120), 2.4, 8), ((612, 250), 2.0, 6)]
    else:
        mo, main, gold, sea, far = (250, 236, 18), (165, 530), (104, 330), 630, [((40, 450), 2.2, 6), ((292, 392), 2.0, 6)]
    glow(d, img, mo[0], mo[1], mo[2] * 3, [(.5, "#3a5788", .8), (1, "#22335a", .9)])
    glow(d, img, *gold, 100, [(.42, "#9a7418", .5), (.7, "#5a4a1e", .45), (1, "#2c4370", .5)])
    stars(d, w, h, rng, w * h // 520, [(mo[0], mo[1], mo[2] + 10), (gold[0], gold[1], 50)])
    moon(d, *mo)
    for (fx, fy), fr, fs in far:
        voxels(d, {p: "far" for p in island(fx, fr, 3, house=False)}, fx, fy, fs, fx)
    cloud_sea(d, w, h, rng, sea)
    top = 6; s = 16; ox, oy = main
    vox = island(7, 7.0, top); voxels(d, vox, ox, oy, s, 7); vines(d, vox, ox, oy, s, rng)
    wx, wy = at(ox, oy, 7, 1, top, s)
    waterfall(d, wx + s - 6, wy + s // 2, sea + 6, rng)
    door(d, ox, oy, top, s)
    hx, hy = at(ox, oy, 0, 1, top, s); fez_hat(d, hx + 4, hy - 4)
    gold_cube(d, *gold, 34, .5, rng)
    vignette(img, 6 if kind == "desktop" else 4)
    img = dither(img.resize((w * 2, h * 2), Image.NEAREST), 6)   # dots at half a pixel: the art stays readable
    return grain(scanlines(img.resize((W, H), Image.NEAREST), scale))



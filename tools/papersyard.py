"""Papers, Please wallpaper, part one: the checkpoint yard at night, seen through the booth window. Original pixel art in
the game's palette (no sprites, logos or crest from the install): a red and dark olive wall with a gate and watchtowers,
floodlight beams cutting through falling snow, and a long snaking queue of silhouettes in heavy coats, rim lit."""
import math, random
from PIL import Image, ImageChops, ImageDraw
from fezart import BAYER, hexc

SKY = [hexc(c) for c in ("#04060a", "#070a11", "#0c1018", "#131925", "#1c2230", "#2a3344", "#3a4558")]
GROUND = [hexc(c) for c in ("#4a566e", "#3a4558", "#2f394b", "#262e3e", "#1f2636", "#171c29", "#10141d")]
INK, COLD, WARM = hexc("#05070a"), hexc("#d6e0ee"), hexc("#e8c27a")
OLIVE, DOLIVE, RED = hexc("#4b5e4c"), hexc("#293229"), hexc("#c41430")


def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def bands(d, pal, x0, x1, y0, y1, curve=1.0):
    """Ordered dither between neighbouring colours of pal, top to bottom: flat bands, no smooth gradient."""
    n = len(pal) - 1
    for y in range(y0, y1):
        t = (((y - y0) / max(1, y1 - y0 - 1)) ** curve) * n; i = min(int(t), n - 1); f = t - i
        for x in range(x0, x1): d.point((x, y), pal[i + 1] if f * 16 > BAYER[y % 4][x % 4] else pal[i])


def lighten(img, lit, x, y, i, col, k=1.0):
    """Dithered light on one pixel: a soft tint everywhere, hard dots where the light is strong. Records it in lit."""
    p = img.getpixel((x, y)); a = .3 if i * 16 > BAYER[y % 4][x % 4] + 1 else .12
    img.putpixel((x, y), mix(p, col, min(1, a * 2 * i * k + (.35 * i if a > .2 else 0))))
    if int(255 * i) > lit.getpixel((x, y)): lit.putpixel((x, y), int(255 * i))


def pool(img, lit, cx, cy, rx, ry, col, k, box):
    for y in range(max(box[1], int(cy - ry)), min(box[3], int(cy + ry) + 1)):
        for x in range(max(box[0], int(cx - rx)), min(box[2], int(cx + rx) + 1)):
            q = math.hypot((x - cx) / rx, (y - cy) / ry)
            if q < 1: lighten(img, lit, x, y, k * (1 - q) ** 2.2, col)


def beam(img, lit, sx, sy, tx, ty, wid, k, box, col=COLD):
    """A floodlight cone from (sx, sy) to a pool of light on the snow at (tx, ty)."""
    L = math.hypot(tx - sx, ty - sy); ux, uy = (tx - sx) / L, (ty - sy) / L
    for y in range(max(box[1], int(min(sy, ty) - wid)), min(box[3], int(max(sy, ty) + wid) + 1)):
        for x in range(max(box[0], int(min(sx, tx) - wid)), min(box[2], int(max(sx, tx) + wid) + 1)):
            dx, dy = x - sx, y - sy; s = (dx * ux + dy * uy) / L
            if not 0 < s < 1: continue
            hw = 1 + wid * s / 2; p = abs(-dx * uy + dy * ux)
            if p < hw: lighten(img, lit, x, y, k * (1 - p / hw) ** 1.4 * (1 - .4 * s), col)
    if col == COLD: pool(img, lit, tx, ty, wid * 1.5, wid * .42, COLD, .9, box)


def skyline(d, G, rng):
    x0, y0, x1, y1 = G["win"]; base = G["hor"] - G["wall"] + 3; u = G["wall"] / 26
    ridge = hexc("#0d1220")
    x = x0
    while x < x1:   # far tenements with a few lit windows, and pines between them
        w = rng.randrange(int(9 * u), int(22 * u)); h = rng.randrange(int(7 * u), int(24 * u))
        if rng.random() < .62:
            d.rectangle([x, base - h, x + w, base], fill=ridge); d.line([(x, base - h), (x + w, base - h)], fill=hexc("#17202f"))
            for wy in range(base - h + 3, base - 2, 4):
                for wx in range(x + 2, x + w - 1, 4):
                    if rng.random() < .13: d.rectangle([wx, wy, wx + 1, wy + 1], fill=hexc("#b08a48"))
        else:
            for k in range(3):
                t = base - h * (k + 1) // 3; hw = w // 2 * (3 - k) // 3 + 2
                d.polygon([(x + w // 2, t - h // 3), (x + w // 2 - hw, t + h // 3), (x + w // 2 + hw, t + h // 3)], fill=hexc("#0a0f1a"))
        x += w + rng.randrange(0, 4)


def tower(d, x, ctop, base, u):
    k = max(1, int(u * 1.3))
    leg, roof = hexc("#0a0d0b"), OLIVE
    for s in (-1, 1):
        d.line([(x + s * int(11 * u), ctop + int(11 * u)), (x + s * int(15 * u), base)], fill=leg, width=k)
    for yy in range(ctop + int(14 * u), base - 3, int(11 * u)):
        wl = 11 + (yy - ctop) * 4 // max(1, base - ctop)
        d.line([(x - int(wl * u), yy), (x + int(wl * u), yy + int(11 * u))], fill=leg); d.line([(x + int(wl * u), yy), (x - int(wl * u), yy + int(11 * u))], fill=leg)
    d.rectangle([x - 13 * u, ctop, x + 13 * u, ctop + 12 * u], fill=hexc("#0c110d"))
    for wx in range(int(-10 * u), int(10 * u), int(5 * u)): d.rectangle([x + wx, ctop + 4 * u, x + wx + 3 * u, ctop + 6 * u], fill=WARM)
    d.polygon([(x - 17 * u, ctop), (x - 11 * u, ctop - 6 * u), (x + 11 * u, ctop - 6 * u), (x + 17 * u, ctop)], fill=roof)
    d.line([(x - 15 * u, ctop - 1), (x + 15 * u, ctop - 1)], fill=hexc("#2e3d2f"))
    d.line([(x + 8 * u, ctop - 6 * u), (x + 8 * u, ctop - 17 * u)], fill=hexc("#0a0d0b"))
    d.polygon([(x + 9 * u, ctop - 17 * u), (x + 17 * u, ctop - 14 * u), (x + 9 * u, ctop - 11 * u)], fill=RED)
    heads = [(x - 15 * u, ctop + 3 * u), (x + 15 * u, ctop + 3 * u)]
    for hx, hy in heads: d.rectangle([hx - 2 * u, hy - 1, hx + 2 * u, hy + u], fill=(255, 250, 225))
    return heads


def gate(d, G):
    gx, gw, hor, top = G["gate"], G["gw"], G["hor"], G["hor"] - G["wall"]
    d.rectangle([gx - gw // 2, top + 3, gx + gw // 2, hor + 1], fill=hexc("#07090d"))
    d.rectangle([gx - gw // 2 + 2, hor - 4, gx + gw // 2 - 2, hor + 1], fill=hexc("#232b3b"))   # a dim road beyond
    for s in (-1, 1): d.rectangle([gx + s * gw // 2 - 2, top - 4, gx + s * gw // 2 + 2, hor + 1], fill=OLIVE); d.line([(gx + s * gw // 2 - 2, top - 4), (gx + s * gw // 2 - 2, hor)], fill=hexc("#7a927a"))
    for x in range(gx - gw // 2 + 2, gx + gw // 2 - 2, 3): d.rectangle([x, hor - 8, x + 1, hor - 6], fill=RED if (x // 3) % 2 else hexc("#e0e3b9"))   # the barrier arm
    bx = gx + gw // 2 + 6   # sentry hut
    d.rectangle([bx, hor - 12, bx + 12, hor + 1], fill=hexc("#0e130f")); d.rectangle([bx - 1, hor - 14, bx + 13, hor - 12], fill=OLIVE); d.rectangle([bx + 3, hor - 9, bx + 9, hor - 6], fill=WARM)
    px = gx - gw // 2 - 8; d.line([(px, top - 4), (px, top - 22)], fill=hexc("#0a0d0b")); d.polygon([(px + 1, top - 22), (px + 11, top - 19), (px + 1, top - 15)], fill=RED)


def person(img, lit, x, foot, h, kind, side, rng, far=0.0):
    """One silhouette seen from behind in a heavy coat, drawn as a mask, filled near black and edged with floodlight on its lit side."""
    h = max(5, int(h)); W, Hh = int(h * .9) + 10, h + 8; mk = Image.new("L", (W, Hh)); d = ImageDraw.Draw(mk); cx, t = W // 2, 4; big = h >= 30
    def P(a, b): return (cx + a * h, t + b * h)
    def r(a, b, c, e): d.rectangle([cx + a * h, t + b * h, cx + max(a, c) * h, t + max(b, e) * h], fill=255)
    def o(a, b, c, e): d.ellipse([cx + a * h, t + b * h, cx + c * h, t + e * h], fill=255)
    w = {3: .2, 4: .22}.get(kind, .23)
    d.polygon([P(-.17, .2), P(.17, .2), P(w + .01, .84), P(-w - .01, .84)], fill=255); o(-.2, .17, .2, .36)   # coat and sloped shoulders
    r(-.12, .8, -.02, 1); r(.02, .8, .12, 1); o(-.07, .04, .07, .2); r(-.04, .17, .04, .24)    # boots, head, neck
    if big:
        d.line([P(-.2, .36), P(-w - .01, .8)], fill=0, width=1); d.line([P(.2, .36), P(w + .01, .8)], fill=0, width=1)   # a gap between arm and coat
        r(-w - .03, .62, -w + .01, .8); r(w - .01, .62, w + .03, .8)   # hands
    if kind == 0: o(-.115, -.01, .115, .12); o(-.125, .05, .125, .17)   # fur hat with flaps
    elif kind == 1: o(-.125, -.01, .125, .25); o(-.08, .15, .08, .3)   # a big hood and scarf
    elif kind == 2: o(-.1, -.01, .1, .09); r(-.13, .06, .13, .08)   # brimmed cap
    elif kind == 3: r(.2, .64, .36, .86); d.line([P(.28, .64), P(.28, .56)], fill=255)   # a suitcase
    elif kind == 4: o(-.3, .42, -.14, .72); r(-.14, .26, -.1, .5)   # a bag on the hip
    elif kind == 5: o(-.1, -.1, .1, .08); o(-.12, .0, .12, .1)   # a tall fur hat
    elif kind == 6: o(-.1, -.02, .1, .09); d.line([P(.2, .82), P(.13, -.04)], fill=255, width=max(1, h // 18))   # cap and rifle
    body = mix(hexc("#06080c"), hexc("#2a3344"), far * .75)   # far figures sit in the haze, near ones are black
    img.paste(Image.new("RGB", mk.size, body), (int(x - cx), int(foot - t - h)), mk)
    if h < 9: return
    k = .62 + .38 * lit.getpixel((int(min(max(x, 0), img.width - 1)), int(min(foot - h // 2, img.height - 1)))) / 255; w = 1 + h // 30
    for n in range(w + 2):   # a bright edge on the lit side, then a soft fall-off into the coat
        e = ImageChops.subtract(mk, ImageChops.offset(mk, side * (n + 1), 0)).point(lambda v: 255 if v > 100 else 0); d2 = ImageDraw.Draw(e); d2.rectangle([0, t + int(.86 * h), mk.width, mk.height], fill=0)
        kk = k if n < w else k * (.3 if n == w else .15)
        if n < w + (1 if h > 25 else 0): img.paste(Image.new("RGB", mk.size, mix(body, COLD, kk)), (int(x - cx), int(foot - t - h)), e)
    top = ImageChops.subtract(mk, ImageChops.offset(mk, 0, 1)).point(lambda v: 255 if v > 100 else 0)
    img.paste(Image.new("RGB", mk.size, mix(body, COLD, k * .6)), (int(x - cx), int(foot - t - h)), top)


def queue(img, lit, G, rng):
    hor, yb, y1 = G["hor"], G["yb"], G["win"][3]
    def at(u):
        return G["gate"] + (G["near_x"] - G["gate"]) * u + G["amp"] * math.sin(u * G["bends"] * math.pi) * u ** .6, hor + (yb - hor) * u, G["h0"] + (G["h1"] - G["h0"]) * u
    d = ImageDraw.Draw(img); steps = []; u = .012
    while True:
        x, y, h = at(u)
        if y > y1 + h * .6: break
        steps.append((x, y, h)); u += G.get("gap", .25) * h / (yb - hor) * rng.uniform(.85, 1.15)
    items = []
    for n, (x, y, h) in enumerate(steps):
        kid = rng.random() < .1; hh = h * (.62 if kid else rng.uniform(.9, 1.08))
        items.append((y, "p", x + rng.uniform(-.14, .14) * h, hh, rng.choice([0, 0, 1, 1, 2, 3, 4, 5]), 1 if x < G["win"][2] / 2 else -1))
        if n % 7 == 4:   # a guard on the flank, rifle slung
            items.append((y + .2, "p", x + (1 if n % 2 else -1) * .8 * h, h, 6, 1 if x < G["win"][2] / 2 else -1))
    for it in sorted(items, key=lambda i: i[0]):
        y, kind = it[0], it[1]
        if kind == "p":
            _, _, x, h, k, side = it
            g = img.getpixel((int(x), min(int(y), img.height - 1)))   # a long shadow thrown away from the floodlight
            d.polygon([(x - .12 * h, y), (x + .12 * h, y), (x + side * 1.0 * h, y + .1 * h)], fill=mix(g, INK, .55))
            person(img, lit, x, y, h, k, side, rng, max(0, 1 - h / G["h1"]) ** 1.5)


def barrel(img, lit, x, y, s, rng, box):
    """A burn barrel: the one warm thing in the cold yard, with a flame and a pool of amber on the snow."""
    for _ in range(2): pool(img, lit, x, y - 2 * s, 50 * s, 16 * s, WARM, .9, box)
    pool(img, lit, x, y - 11 * s, 18 * s, 16 * s, WARM, .7, box); d = ImageDraw.Draw(img)
    d.ellipse([x - 5 * s, y - 1, x + 5 * s, y + 2 * s], fill=hexc("#07090d"))
    d.rectangle([x - 4 * s, y - 9 * s, x + 4 * s, y], fill=hexc("#1b1612")); d.line([(x - 4 * s, y - 9 * s), (x - 4 * s, y)], fill=hexc("#5a4632"))
    for hy in (6, 3): d.line([(x - 4 * s, y - hy * s), (x + 4 * s, y - hy * s)], fill=hexc("#3a3a42"))
    d.ellipse([x - 4 * s, y - 10 * s, x + 4 * s, y - 8 * s], fill=hexc("#ffb040"))
    for col, hh, ww in ((hexc("#c43c14"), 11, 4), (hexc("#f08a28"), 8, 3), (hexc("#ffe27a"), 4.5, 1.8)):
        tip = x + rng.uniform(-1, 1) * s; d.polygon([(x - ww * s, y - 9 * s), (x - ww * s * .5, y - (9 + hh * .6) * s), (tip, y - (9 + hh) * s), (x + ww * s * .6, y - (9 + hh * .5) * s), (x + ww * s, y - 9 * s)], fill=col)
    for _ in range(int(5 * s)): d.point((x + rng.uniform(-6, 6) * s, y - rng.uniform(14, 26) * s), hexc("#ffb040"))


def snow(img, lit, G, rng, scale):
    x0, y0, x1, y1 = G["win"]; d = ImageDraw.Draw(img); calm = y0 + G["calm"]
    for cnt, col, size in ((int(560 * scale), hexc("#56627a"), 1), (int(300 * scale), hexc("#9aa6ba"), 1), (int(55 * scale), hexc("#eef3f8"), 2)):
        for _ in range(cnt):
            x, y = rng.randrange(x0, x1 - 2), rng.randrange(y0, y1 - 2)
            if y < calm and rng.random() < .7: continue
            c = mix(col, (255, 255, 255), lit.getpixel((x, y)) / 255 * .7)
            d.rectangle([x, y, x + size - 1, y + size - 1], fill=c)
            if size == 2: d.point((x - 1, y - 2), mix(c, INK, .55))   # a short wind streak
    for _ in range(int(60 * scale)): d.point((rng.randrange(x0, x1), rng.randrange(y0, y1)), hexc("#eef3f8"))


def yard(img, G, rng, scale):
    d = ImageDraw.Draw(img); lit = Image.new("L", img.size); x0, y0, x1, y1 = box = G["win"]; hor, wh = G["hor"], G["wall"]; top = hor - wh; u = wh / 26
    bands(d, SKY, x0, x1, y0, hor + 1, 1.35); skyline(d, G, rng)
    pool(img, lit, (x0 + x1) // 2, top - 6, (x1 - x0) * .55, wh * 1.6, COLD, .3, box); d = ImageDraw.Draw(img)
    heads = []
    for tx in G["towers"]: heads += tower(d, tx, G["ctop"], hor + 1, G["tu"])
    d.rectangle([x0, top, x1, hor + 1], fill=DOLIVE); d.rectangle([x0, top, x1, top + 1], fill=OLIVE)
    d.rectangle([x0, top + int(wh * .45), x1, top + int(wh * .45) + max(2, wh // 7)], fill=RED)
    for y in range(top + 4, hor, 4):
        for x in range(x0 + (y // 4 % 2) * 4, x1, 8): d.point((x, y), hexc("#222b23"))
    for x in range(x0 + 12, x1, 28): d.rectangle([x, top, x + 1, hor + 1], fill=hexc("#3a4a3b"))
    gate(d, G)
    bands(d, GROUND, x0, x1, hor + 2, y1 + 1, .8)
    for _ in range(int(400 * scale)):   # speckle and drifts
        x, y = rng.randrange(x0, x1), rng.randrange(hor + 3, y1)
        d.point((x, y), mix(img.getpixel((x, y)), COLD, .3))
    for x in range(x0, x1, 7):
        h = 2 + rng.randrange(3); d.ellipse([x - 5, hor + 1 - h, x + 5, hor + 3], fill=mix(hexc("#46526a"), COLD, .15))
    for lx in G["posts"]:   # small lamps along the wall
        d.line([(lx, top - 5), (lx, top)], fill=INK); d.rectangle([lx - 2, top - 7, lx + 2, top - 5], fill=(255, 246, 215)); heads.append((lx, top - 6))
    for (hx, hy), (tx, ty, wd) in zip(heads[:4], G["beams"]): beam(img, lit, hx, hy, tx, ty, wd, .9, box)
    for hx, hy in heads: pool(img, lit, hx, hy, 15 * u, 10 * u, COLD, .8, box)
    pool(img, lit, G["gate"], hor + 4, 26 * u, 9 * u, WARM, .7, box)
    for bx, by, bs in G["barrels"]: barrel(img, lit, bx, by, bs, rng, box)
    queue(img, lit, G, rng); snow(img, lit, G, rng, scale)
    return lit

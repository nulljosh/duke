"""Papers, Please wallpaper art for wallpapers.py: original pixel art in the game's palette (no sprites, logos or crest
from the install). The inspector's booth at night: through the window a floodlit checkpoint yard in falling snow with a long
queue (papersyard.py); on the desk, under one warm lamp, a bulletin, a passport with a red DENIED stamp mid-impact and the
ink splatter. Drawn low, scaled up with NEAREST and finished like the FEZ art: dither, scanlines, grain."""
import math, random
from PIL import Image, ImageDraw
from fezart import BAYER, SIZES, dither, grain, scanlines, vignette
from papersyard import COLD, DOLIVE, INK, OLIVE, RED, WARM, beam, mix, pool, yard
from fezart import hexc

CREAM, PAPER, SHADE = hexc("#e0e3b9"), hexc("#cfd0ae"), hexc("#a9ad88")
GLYPHS = {   # 5x7 pixel font, only the letters the wallpaper prints
    "A": (".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"), "B": ("####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."),
    "D": ("####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."), "E": ("#####", "#....", "#....", "####.", "#....", "#....", "#####"),
    "G": (".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."), "O": (".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."),
    "K": ("#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"), "Z": ("#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"),
    "I": ("#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"), "L": ("#....", "#....", "#....", "#....", "#....", "#....", "#####"),
    "N": ("#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"), "R": ("####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"),
    "S": (".####", "#....", "#....", ".###.", "....#", "....#", "####."), "T": ("#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."),
    "U": ("#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."), "V": ("#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."),
    "Y": ("#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."), " ": (".....",) * 7,
}
LAYOUT = {   # low-res coordinates. The phone keeps y < 70 (the clock) sky only, and y > 660 (the dock) dark desk
    "phone": dict(
        yard=dict(win=(14, 6, 316, 398), hor=205, wall=26, yb=470, gate=205, gw=30, towers=[42, 288], ctop=134, tu=1, posts=[110, 160, 250],
                  beams=[(150, 330, 46), (110, 270, 40), (210, 360, 50), (170, 255, 36)], h0=6, h1=128, near_x=96, amp=96, bends=4.3, calm=70, barrels=[(36, 300, 1.5), (290, 352, 2.3)]),
        scale=1, dtop=405, pool=(175, 540, 190, 135), pp=(192, 536, 98, 126, -3), bul=(66, 518, 82, 112, 6), stamp=(194, 582, 3, -10),
        tool=(282, 532, 1.5, 24), lamp=(66, 410, 46, 646, 41), coins=[(116, 636), (132, 642), (124, 648)], pad=(190, 646), mug=(278, 612)),
    "desktop": dict(
        yard=dict(win=(22, 10, 618, 212), hor=122, wall=22, yb=292, gate=330, gw=22, towers=[96, 560], ctop=72, tu=.7, posts=[190, 250, 440],
                  beams=[(250, 190, 34), (210, 160, 30), (420, 200, 36), (370, 168, 28)], h0=4, h1=78, gap=.15, near_x=150, amp=200, bends=3.2, calm=0, barrels=[(70, 170, 1.1), (580, 190, 1.5)]),
        scale=1.5, dtop=219, pool=(335, 292, 250, 90), pp=(345, 288, 72, 88, -3), bul=(240, 292, 56, 80, 7), stamp=(347, 322, 2, -10),
        tool=(430, 300, 1.0, 16), lamp=(178, 232, 150, 350, 38), coins=[(470, 332), (484, 337), (477, 342)], pad=(540, 320), mug=(95, 318)),
}


def width(word, s): return (len(word) * 6 - 1) * s


def text(d, x, y, word, col, s):
    for i, ch in enumerate(word):
        for r, row in enumerate(GLYPHS[ch]):
            for c, on in enumerate(row):
                if on == "#": d.rectangle([x + (i * 6 + c) * s, y + r * s, x + (i * 6 + c) * s + s - 1, y + r * s + s - 1], fill=col)


def dashes(d, x0, x1, y, col, step=2):
    for x in range(int(x0), int(x1), step): d.point((x, y), col)


def put(img, layer, cx, cy, ang, shade=(3, 4)):
    """Rotate a layer (NEAREST), cast a hard shadow, paste it centred at (cx, cy)."""
    r = layer.rotate(ang, resample=Image.NEAREST, expand=True); a = r.getchannel("A"); x, y = int(cx - r.width / 2), int(cy - r.height / 2)
    img.paste((3, 4, 7), (x + shade[0], y + shade[1]), a.point(lambda v: 170 if v > 0 else 0)); img.paste(r.convert("RGB"), (x, y), a)


def layer(w, h): im = Image.new("RGBA", (int(w), int(h))); return im, ImageDraw.Draw(im)


def passport(pw, ph):
    c = 3; im, d = layer(2 * pw + 2 * c, ph + 2 * c); W, H = im.size
    d.rectangle([0, 0, W - 1, H - 1], fill=RED); d.line([(0, H - 1), (W - 1, H - 1)], fill=hexc("#7a0e1e")); d.rectangle([c, c, W - c - 1, H - c - 1], fill=CREAM)
    for i in range(9): d.line([(pw + c - i, c), (pw + c - i, H - c - 1)], fill=mix(CREAM, SHADE, (1 - i / 9) * .55)); d.line([(pw + c + i, c), (pw + c + i, H - c - 1)], fill=mix(CREAM, SHADE, (1 - i / 9) * .35))
    d.line([(pw + c, c), (pw + c, H - c - 1)], fill=hexc("#7d8566"))
    lx, ly, ps = c + int(pw * .1), c + int(ph * .1), int(pw * .4)   # left page: the photo, name lines, a plain seal, the machine strip
    d.rectangle([lx, ly, lx + ps, ly + int(ps * 1.2)], fill=hexc("#8d9484"), outline=DOLIVE)
    px = lx + ps // 2; d.ellipse([px - ps * .17, ly + ps * .22, px + ps * .17, ly + ps * .6], fill=hexc("#1a1f1a")); d.polygon([(px - ps * .38, ly + ps * 1.18), (px - ps * .3, ly + ps * .7), (px + ps * .3, ly + ps * .7), (px + ps * .38, ly + ps * 1.18)], fill=hexc("#1a1f1a"))
    d.line([(px - ps * .17, ly + ps * .3), (px - ps * .17, ly + ps * .5)], fill=hexc("#8a96a8"))
    for k in range(3): dashes(d, lx + ps + 6, lx + ps + 6 + pw * (.32 - k * .06), ly + 4 + k * 7, DOLIVE)
    for k in range(3): dashes(d, lx, lx + pw * (.8 - k * .12), ly + int(ps * 1.2) + 8 + k * 6, DOLIVE)
    sx, sy, sr = lx + ps + int(pw * .22), ly + int(ps * 1.2) - int(pw * .12), int(pw * .13)
    d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], outline=OLIVE); d.ellipse([sx - sr + 3, sy - sr + 3, sx + sr - 3, sy + sr - 3], outline=OLIVE)
    for yy in range(sy - sr + 6, sy + sr - 4, 3): d.line([(sx - sr + 4, yy), (sx + sr - 4, yy)], fill=OLIVE)
    for k in range(2): dashes(d, lx, c + pw * .93 - 2, H - c - 9 + k * 4, hexc("#5d6650"), 1 if k else 2)
    rc = pw + c + pw // 2; bw = width("ENTRY VISA", 1) + 8; bx, by, bh = rc - bw // 2, ly, int(ph * .4)   # right page: the visa box
    for x in range(bx, bx + bw, 2): d.point((x, by), DOLIVE); d.point((x, by + bh), DOLIVE)
    for y in range(by, by + bh, 2): d.point((bx, y), DOLIVE); d.point((bx + bw, y), DOLIVE)
    text(d, bx + 4, by + 4, "ENTRY VISA", DOLIVE, 1)
    for k in range(3): dashes(d, bx + 4, bx + bw - 4, by + 16 + k * 6, DOLIVE)
    for k in range(4): dashes(d, bx, bx + bw * (1 - k * .1), by + bh + 10 + k * 6, hexc("#7d8566"))
    return im


def bulletin(w, h):
    im, d = layer(w, h); d.rectangle([0, 0, w - 1, h - 1], fill=PAPER); d.rectangle([0, 0, w - 1, 12], fill=RED); text(d, w // 2 - width("BULLETIN", 1) // 2, 3, "BULLETIN", CREAM, 1)
    for k in range(3):
        bx, by = 8 + k * (w - 16) // 3, 20; d.rectangle([bx, by, bx + 16, by + 16], outline=DOLIVE); d.line([(bx + 2, by + 2), (bx + 14, by + 14)], fill=RED); d.line([(bx + 14, by + 2), (bx + 2, by + 14)], fill=RED)
    for k in range(7): dashes(d, 8, w - 8 - (k % 3) * 9, 46 + k * 7, DOLIVE)
    d.rectangle([8, h - 22, w - 9, h - 10], outline=OLIVE); dashes(d, 12, w - 20, h - 16, OLIVE)
    d.line([(0, 0), (0, h - 1)], fill=CREAM); return im


def imprint(s, rng):
    tw = width("DENIED", s); p = 2 * s; im, d = layer(tw + 2 * p + 4 * s, 7 * s + 2 * p + 4 * s); W, H = im.size
    d.rectangle([0, 0, W - 1, H - 1], outline=RED, width=s); d.rectangle([s * 2, s * 2, W - 1 - s * 2, H - 1 - s * 2], outline=RED, width=max(1, s // 2))
    text(d, (W - tw) // 2, (H - 7 * s) // 2, "DENIED", RED, s); px = im.load()
    for y in range(H):
        for x in range(W):   # worn ink: random knock-outs, heavier on the low side where the stamp pressed less
            if px[x, y][3] and rng.random() < .05 + .16 * (x / W) * (y / H): px[x, y] = (0, 0, 0, 0)
    return im


def tool(sc):
    im, d = layer(46 * sc + 1, 48 * sc + 1); wood, hi = hexc("#3b2a1e"), hexc("#7a5a3a"); m = 23 * sc
    d.rectangle([m - 4 * sc, 14 * sc, m + 4 * sc, 33 * sc], fill=wood); d.line([(m - 3 * sc, 14 * sc), (m - 3 * sc, 33 * sc)], fill=hi)
    d.ellipse([m - 11 * sc, 0, m + 11 * sc, 17 * sc], fill=wood); d.arc([m - 9 * sc, 2 * sc, m + 9 * sc, 15 * sc], 190, 280, fill=hi, width=max(1, int(sc)))
    d.rectangle([2 * sc, 31 * sc, 44 * sc, 40 * sc], fill=hexc("#0d0d0f")); d.line([(2 * sc, 31 * sc), (44 * sc, 31 * sc)], fill=hexc("#4a566a")); d.rectangle([3 * sc, 40 * sc, 43 * sc, 43 * sc], fill=RED)
    return im


def splatter(d, cx, cy, hw, rng, n):
    for _ in range(n):
        a = rng.uniform(0, 6.28); r = hw * rng.uniform(.55, 1.3) * (1.25 if math.sin(a) > 0 else .85); x, y = cx + r * math.cos(a), cy + r * math.sin(a) * .5
        z = 2 if rng.random() < .22 else 1; c = mix(RED, INK, rng.choice([0, 0, .25, .4]))
        d.rectangle([x, y, x + z - 1, y + z - 1], fill=c)
        if z == 2 and rng.random() < .7: d.point((x - math.cos(a) * 3, y - math.sin(a) * 1.5), c)


def lamp_light(img, D, H):
    px = img.load(); cx, cy, rx, ry = D["pool"]
    for y in range(D["dtop"] - 7, H):
        for x in range(img.width):
            q = math.hypot((x - cx) / rx, (y - cy) / ry); i = max(0, 1 - q) ** 1.1; f = .34 + .66 * i; r, g, b = px[x, y]
            px[x, y] = (min(255, int(r * f * (1 + .22 * i))), min(255, int(g * f * (1 + .02 * i))), int(b * f * (1 - .3 * i)))


def lamp(img, D, rng):
    d = ImageDraw.Draw(img); sx, sy, bx, by, ang = D["lamp"]; a = math.radians(ang); dx, dy = math.cos(a), math.sin(a); nx, ny = -dy, dx
    k = 1.5 if img.width < 400 else 1.0; hh = by - sy
    p0, p1, p2, p3 = (bx, by), (bx + 3 * k, by - .5 * hh), (sx - 34 * k, sy - 6 * k), (sx - 2 * k, sy - 2 * k)
    pts = [tuple(((1 - t) ** 3) * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t * t * p2[i] + t ** 3 * p3[i] for i in (0, 1)) for t in [j / 50 for j in range(51)]]
    d.line(pts, fill=hexc("#0b0d10"), width=max(2, int(3 * k))); d.line([(x + k, y) for x, y in pts], fill=hexc("#4a566a"), width=1)
    d.ellipse([bx - 17 * k, by - 4 * k, bx + 17 * k, by + 6 * k], fill=hexc("#0b0d10")); d.line([(bx - 15 * k, by - 3 * k), (bx + 13 * k, by - 3 * k)], fill=hexc("#4a566a"))
    L, wn, wf = 26 * k, 5 * k, 16 * k; ox, oy = sx + dx * L, sy + dy * L
    d.polygon([(sx + nx * wn, sy + ny * wn), (ox + nx * wf, oy + ny * wf), (ox - nx * wf, oy - ny * wf), (sx - nx * wn, sy - ny * wn)], fill=DOLIVE)
    d.line([(sx - nx * wn, sy - ny * wn), (ox - nx * wf, oy - ny * wf)], fill=hexc("#7a927a"), width=max(1, int(k * 1.5)))
    d.line([(sx + nx * wn, sy + ny * wn), (ox + nx * wf, oy + ny * wf)], fill=hexc("#1c2420"), width=max(1, int(k)))
    d.polygon([(ox + nx * wf + dx * 2, oy + ny * wf + dy * 2), (ox - nx * wf + dx * 2, oy - ny * wf + dy * 2), (ox - nx * wf * .75 + dx * 7, oy - ny * wf * .75 + dy * 7), (ox + nx * wf * .75 + dx * 7, oy + ny * wf * .75 + dy * 7)], fill=(255, 244, 205))
    pool(img, Image.new("L", img.size), ox + dx * 9, oy + dy * 9, 85 * k, 85 * k, WARM, .8, (0, D["dtop"] - 70, img.width, img.height))


def papers(kind):
    W, H = SIZES[kind]; desktop = kind == "desktop"; scale = 8 if desktop else 4; w, h = W // scale, H // scale
    D = LAYOUT[kind]; G = D["yard"]; x0, y0, x1, y1 = G["win"]; dtop = D["dtop"]; rng = random.Random(41)
    img = Image.new("RGB", (w, h), hexc("#07090d")); d = ImageDraw.Draw(img); yard(img, G, rng, D["scale"]); d = ImageDraw.Draw(img)
    sl = "GLORY TO ARSTOTZKA"; text(d, 69 if not desktop else 366, G["hor"] - 9, sl, mix(CREAM, DOLIVE, .45), 1)   # painted on the wall
    for r in ([0, 0, w, y0 - 1], [0, 0, x0 - 1, h], [x1 + 1, 0, w, h], [0, y1 + 1, w, h]): d.rectangle(r, fill=hexc("#07090d"))
    d.rectangle([x0 - 3, y0 - 3, x1 + 3, y1 + 3], outline=hexc("#2a3344"), width=2); d.rectangle([x0 - 1, y0 - 1, x1 + 1, y1 + 1], outline=hexc("#0b0e14"))
    for _ in range(int(2400 * D["scale"])):   # frost creeping in from the edges of the glass
        e = rng.uniform(0, 1) ** 2.8 * 18; side = rng.randrange(4); t = rng.random()
        x, y = ((x0 + t * (x1 - x0), y0 + e), (x0 + t * (x1 - x0), y1 - e), (x0 + e, y0 + t * (y1 - y0)), (x1 - e, y0 + t * (y1 - y0)))[side]
        if y < y0 + 70 and not desktop and side != 0: continue
        d.point((int(x), int(y)), mix(img.getpixel((int(x), int(y))), COLD, .55))
    d.rectangle([x0 - 3, y1 + 4, x1 + 3, y1 + 6], fill=hexc("#2a231d")); d.rectangle([0, y1 + 7, w, h], fill=hexc("#2a1e14")); d.line([(x0 - 3, y1 + 4), (x1 + 3, y1 + 4)], fill=hexc("#6a5a48"))
    for y in range(dtop + 4, h, 7): d.line([(0, y), (w, y)], fill=hexc("#2e2216" if y % 14 else "#1a120b"))
    for x in range(40, w, 90): d.line([(x + (dtop % 13), dtop), (x + (dtop % 13), h)], fill=hexc("#120d09"))
    bx, by, bw, bh, ba = D["bul"]; put(img, bulletin(bw, bh), bx, by, ba)
    pw, ph = D["pp"][2:4]; put(img, passport(pw, ph), D["pp"][0], D["pp"][1], D["pp"][4], (4, 5))
    sx, sy, ss, sa = D["stamp"]; put(img, imprint(ss, rng), sx, sy, sa, (0, 0)); sp = ImageDraw.Draw(img)
    splatter(sp, sx, sy, width("DENIED", ss) * .62, rng, 70 if not desktop else 50)
    tx, ty, tk, ta = D["tool"]; put(img, tool(tk), tx, ty, ta, (7, 10))
    for cx, cy in D["coins"]:
        sp.ellipse([cx - 4, cy - 2, cx + 4, cy + 2], fill=hexc("#8a6a2c")); sp.ellipse([cx - 4, cy - 3, cx + 4, cy + 1], fill=hexc("#e8c27a")); sp.line([(cx - 2, cy - 2), (cx + 1, cy - 2)], fill=(255, 244, 205))
    px, py = D["pad"]; sp.rectangle([px - 16, py - 8, px + 16, py + 8], fill=hexc("#14171c"), outline=hexc("#4a566a")); sp.rectangle([px - 12, py - 5, px + 12, py + 5], fill=RED); sp.line([(px - 11, py - 4), (px + 5, py - 4)], fill=hexc("#e8506a"))
    mx, my = D["mug"]; sp.ellipse([mx - 9, my + 12, mx + 10, my + 17], fill=hexc("#1a1008")); sp.rectangle([mx - 8, my, mx + 8, my + 14], fill=hexc("#aeb7a0")); sp.ellipse([mx - 8, my + 10, mx + 8, my + 16], fill=hexc("#aeb7a0"))
    sp.arc([mx + 4, my + 3, mx + 15, my + 12], 270, 90, fill=hexc("#aeb7a0"), width=2); sp.ellipse([mx - 8, my - 3, mx + 8, my + 3], fill=hexc("#d8dcc4")); sp.ellipse([mx - 6, my - 2, mx + 6, my + 2], fill=hexc("#2a1a10")); sp.line([(mx - 7, my + 2), (mx - 7, my + 12)], fill=hexc("#e8ecd8"))
    for k in range(14): sp.point((mx + int(2.5 * math.sin(k * .7)) - 1, my - 6 - k), hexc("#8a96a8") if k % 2 else hexc("#c4ccd8"))   # steam
    lamp_light(img, D, h)
    lp = D["lamp"]; lx, ly = lp[0] + math.cos(math.radians(lp[4])) * 30, lp[1] + math.sin(math.radians(lp[4])) * 30
    beam(img, Image.new("L", img.size), lx, ly, D["pool"][0] - 20, D["pool"][1] + 10, 120 if not desktop else 90, .32, (0, D["dtop"], w, h), WARM)
    ramp = h - (68 if not desktop else 30)
    for y in range(ramp, h):
        for x in range(w): r, g, b = img.getpixel((x, y)); f = 1 - .6 * (y - ramp) / (h - ramp); img.putpixel((x, y), (int(r * f), int(g * f), int(b * f)))
    lamp(img, D, rng)
    f = 6 if desktop else 4
    vignette(img, f); ImageDraw.Draw(img).rectangle([f, f, w - 1 - f, h - 1 - f], outline=OLIVE)
    img = dither(img.resize((w * 2, h * 2), Image.NEAREST), 6)
    return grain(scanlines(img.resize((W, H), Image.NEAREST), scale))

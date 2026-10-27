#!/usr/bin/env python3
"""Draw the Duke, FEZ and Papers, Please wallpapers into brand/wallpapers/ (desktop 5120x2880, phone 1320x2868).
  python3 tools/wallpapers.py
FEZ is original pixel art in the game's spirit (no sprites from the install): a floating island at night,
the golden cube and its eight bits, ordered-dithered with scanlines and grain. Duke is dressed like the Hermes landing
(after Nous Research): Neptune's Horses in scanlines on the band, grain, a thin frame, tiny caps and the games it plays."""
import io, math, re, subprocess
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "brand" / "wallpapers"


from fezart import SIZES, dither, fez, hexc   # noqa: E402  the FEZ art lives in its own file
from papersart import papers                  # noqa: E402  Papers, Please art, original, in the game's palette


# ---------- Duke: the brand tile, Neptune's Horses and one glyph per game ----------

def gear(cx, cy, r, teeth=8):
    pts = []
    for n in range(teeth * 4):
        a = n * math.pi * 2 / (teeth * 4); rr = r if n % 4 in (1, 2) else r * .78
        pts.append(f"{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}")
    hole = r * .32
    return (f'<path fill-rule="evenodd" d="M{" L".join(pts)} Z M{cx + hole},{cy} a{hole},{hole} 0 1,0 {-2 * hole},0 '
            f'a{hole},{hole} 0 1,0 {2 * hole},0 Z"/>')


GLYPHS = {   # each drawn in a 100x100 box, white: Duolingo's four tracks, then the three games
    "languages": '<path opacity=".55" d="M40 14 H86 Q94 14 94 22 V50 Q94 58 86 58 H80 V70 L66 58 H40 Q32 58 32 50 V22 Q32 14 40 14 Z"/>'
                 '<path d="M14 34 H62 Q70 34 70 42 V70 Q70 78 62 78 H34 L20 90 V78 H14 Q6 78 6 70 V42 Q6 34 14 34 Z"/>',
    "math": '<path d="M20 26 H44 V34 H20 Z M28 18 H36 V42 H28 Z M56 26 H80 V34 H56 Z M20 66 H44 V74 H20 Z '
            'M56 60 H80 V68 H56 Z M56 72 H80 V80 H56 Z"/>',
    "chess": '<path d="M26 86 H74 V76 H66 L62 46 H70 V18 H60 V28 H54 V18 H46 V28 H40 V18 H30 V46 H38 L34 76 H26 Z"/>',
    "music": '<path d="M30 22 L80 12 V68 A11 9 -20 1 1 72 60 V30 L38 37 V78 A11 9 -20 1 1 30 70 Z"/>',
    "factorio": gear(50, 50, 44),
    "gamedev": '<path fill-rule="evenodd" d="M28 28 H72 Q94 28 96 60 Q98 84 82 84 Q72 84 66 70 H34 Q28 84 18 84 Q2 84 4 60 '
               'Q6 28 28 28 Z M22 46 H30 V38 H36 V46 H44 V52 H36 V60 H30 V52 H22 Z M68 44 a5 5 0 1 0 0.1 0 Z M78 54 a5 5 0 1 0 0.1 0 Z"/>',
    "fez": '<path d="M50 8 L88 30 L50 52 L12 30 Z"/><path opacity=".72" d="M12 30 L50 52 V94 L12 72 Z"/>'
           '<path opacity=".45" d="M88 30 L50 52 V94 L88 72 Z"/>',
}


def mark():
    src = (ROOT / "brand" / "mark.svg").read_text()
    return re.sub(r"^<svg[^>]*>|</svg>\s*$", "", src.strip()).replace("currentColor", "#fff")


FONTS = ROOT / "fonts"
BAND, ART, SUB = (0, 99, 186), (127, 189, 242), (214, 232, 251)   # tokens.css: --band, --band-art, --band-sub


def svg_png(body, w, h):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
    return Image.open(io.BytesIO(subprocess.run(["rsvg-convert", "-"], input=svg.encode(), capture_output=True, check=True).stdout)).convert("RGBA")


def caps(d, xy, text, size, fill, track=.22):
    f = ImageFont.truetype(str(FONTS / "DukeSans-Medium.ttf"), size); x, y = xy
    for ch in text:   # tiny caps with wide tracking, the Nous label
        d.text((x, y), ch, font=f, fill=fill); x += f.getlength(ch) + size * track
    return x


ARTS = {   # public domain, from Wikimedia Commons; dithered once into dot masks kept in brand/wallpapers/art/
    "great-wave": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/3840px-Tsunami_by_hokusai_19th_century.jpg",
    "duke": "https://upload.wikimedia.org/wikipedia/commons/c/c2/StateLibQld_2_233981_Duke_Kahanamoku%2C_Hawaiian_surfing_exponent.jpg",
}


def art_mask(name):
    """A dot mask (L) for one artwork: ink and shadow become dots, paper and foam stay clear."""
    path = OUT / "art" / f"{name}.png"
    if path.exists(): return Image.open(path).convert("L")
    raw = Image.open(io.BytesIO(subprocess.run(["curl", "-sL", "-A", "SurfWallpaper/1.0", ARTS[name]], capture_output=True, check=True).stdout)).convert("L")
    if name == "great-wave":
        raw = raw.transpose(Image.FLIP_LEFT_RIGHT)   # the crest curls in from the right, toward the lockup
        a = raw.point(lambda v: max(0, min(255, int((205 - v) * 1.6))))
        w, h = a.size; ImageDraw.Draw(a).rectangle([int(w * .84), 0, w, int(h * .24)], fill=0)   # drop the title cartouche
    else:
        raw = raw.crop((40, 20, raw.width - 40, raw.height - 10)).resize((raw.width * 3, raw.height * 3), Image.LANCZOS)
        a = raw.point(lambda v: max(0, min(255, int((215 - v) * 1.5))))
        w, h = a.size; fall = Image.new("L", (w, h)); fp = fall.load()
        for y in range(h):   # fade out toward the edges so he stands free of the beach
            for x in range(w):
                q = math.hypot((x - w * .5) / (w * .46), (y - h * .52) / (h * .56))
                fp[x, y] = int(255 * max(0, min(1, (1.05 - q) * 3)))
        a = ImageChops.multiply(a, fall)
    a = dither(Image.merge("RGB", (a, a, a)), 2).split()[0]   # two levels: pure dots
    path.parent.mkdir(parents=True, exist_ok=True); a.save(path, optimize=True)
    return a


def place(img, mask, box, tint, alpha, period):
    """Scale a dot mask into box (x, y, height), lay scanlines over it and tint it onto the band."""
    W, H = img.size; x, y, hh = box
    m = mask.resize((int(mask.width * hh / mask.height), hh), Image.NEAREST)
    layer = Image.new("L", (W, H)); layer.paste(m, (int(x), int(y)))
    col = Image.new("L", (1, H)); col.putdata([0 if r % period >= period // 2 else 255 for r in range(H)])
    layer = ImageChops.multiply(layer, col.resize((W, H), Image.NEAREST)).point(lambda v: int(v * alpha))
    t = Image.new("RGBA", (W, H), tint + (0,)); t.putalpha(layer); img.alpha_composite(t)


def duke(kind):
    """Dressed like the Hermes landing (after Nous Research): the band blue, Hokusai's Great Wave and Duke Kahanamoku
    with his board as dot masks in scanlines, film grain, a thin frame, tiny caps, a giant wordmark and the games."""
    W, H = SIZES[kind]; desk = kind == "desktop"
    img = Image.new("RGBA", (W, H), BAND + (255,))
    wave, duke = art_mask("great-wave"), art_mask("duke")
    p = 6 if desk else 4
    if desk:
        wh = int(H * 1.02); place(img, wave, (W - wave.width * wh / wave.height + W * .02, H - wh, wh), ART, .62, p)
        dh = int(H * .86); place(img, duke, (W * .36, H - dh, dh), SUB, .95, p)
    else:
        wh = int(H * .62); place(img, wave, (W - wave.width * wh / wave.height + W * .35, H - wh, wh), ART, .62, p)
        dh = int(H * .58); place(img, duke, (W * .5 - duke.width * dh / duke.height / 2, H - dh, dh), SUB, .95, p)
    n = Image.effect_noise((W // 2, H // 2), 60).resize((W, H), Image.NEAREST)   # white film grain
    white = Image.new("RGBA", (W, H), (255, 255, 255, 0)); white.putalpha(n.point(lambda v: int(max(0, v - 128) * .14))); img.alpha_composite(white)
    d = ImageDraw.Draw(img)
    m = 64 if desk else 40
    d.rectangle([m, m, W - 1 - m, H - 1 - m], outline=ART + (110,), width=3 if desk else 2)
    x0, top, mk, small, big, g = (240, 300, 220, 46, 560, 92) if desk else (96, int(H * .2), 120, 26, 250, 60)
    img.alpha_composite(svg_png(f'<g transform="scale({mk / 1024})">{mark()}</g>', mk, mk), (x0 - mk // 10, top))
    y = top + mk + small * 2
    caps(d, (x0, y), "PLAYS WHILE YOU SLEEP", small, SUB + (255,))
    f = ImageFont.truetype(str(FONTS / "DukeSans-Bold.ttf"), big)
    d.text((x0 - big * .05, y + small * 1.2), "Duke", font=f, fill=(255, 255, 255, 255))
    y += small * 1.2 + big * 1.12
    caps(d, (x0, y), "DUOLINGO  FACTORIO  GAME DEV TYCOON  FEZ", small, SUB + (230,))
    row = "".join(f'<g transform="translate({n * g * 1.7} 0) scale({g / 100})" fill="#fff">{GLYPHS[k]}</g>' for n, k in enumerate(GLYPHS))
    img.alpha_composite(svg_png(row, int(g * 1.7 * len(GLYPHS)), g), (x0, int(y + small * 2.4)))
    cred = "HOKUSAI, THE GREAT WAVE, C. 1831. DUKE KAHANAMOKU, C. 1915. PUBLIC DOMAIN"; cs = int(small * (.7 if desk else .55))
    fw = caps(ImageDraw.Draw(Image.new("RGBA", (1, 1))), (0, 0), cred, cs, SUB)
    caps(d, (W - m - (48 if desk else 20) - fw, H - m - (48 if desk else 20) - cs), cred, cs, SUB + (190,))
    return img.convert("RGB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for kind in SIZES:
        fez(kind).save(OUT / f"fez-{kind}.png", optimize=True)
        duke(kind).save(OUT / f"duke-{kind}.png", optimize=True)
        papers(kind).save(OUT / f"papers-{kind}.png", optimize=True)
    print("\n".join(str(p) for p in sorted(OUT.glob("*.png"))))

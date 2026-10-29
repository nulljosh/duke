#!/usr/bin/env python3
"""Draw the Duke, FEZ, Papers, Please and Oxygen Not Included wallpapers into brand/wallpapers/ (desktop 5120x2880, phone 1320x2868).
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
from oniart import oni                        # noqa: E402  Oxygen Not Included art, original, with the live cycle


# ---------- Duke: the brand tile, the Great Wave and one colour tile per game ----------

GAMES = [("DUOLINGO", "#2e8b3a"), ("FACTORIO", "#c4570f"), ("GAME DEV TYCOON", "#0063ba"), ("FEZ", "#b08a00"),
         ("PAPERS, PLEASE", "#b5302a"), ("OXYGEN NOT INCLUDED", "#3d7a5c"), ("POKEMON SAPPHIRE", "#3a5aa8"),
         ("PIKMIN 2", "#1f6e3a"), ("MIRAGE", "#9a4a1f")]   # tokens.css --g-*, Sapphire navy lifted for the ink


def mark():
    src = (ROOT / "brand" / "mark.svg").read_text()
    return re.sub(r"^<svg[^>]*>|</svg>\s*$", "", src.strip()).replace("currentColor", "#fff")


FONTS = ROOT / "fonts"
BAND, ART, SUB = (22, 22, 26), (232, 105, 26), (199, 199, 204)   # tokens.css: --band (ink), --accent (Duke orange), --band-sub


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
    """Dressed like the Hermes landing (after Nous Research): Duke ink, Hokusai's Great Wave and Duke Kahanamoku
    with his board as dot masks in scanlines, film grain, a thin frame, tiny caps, a giant wordmark, every game and its colour tile."""
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
    per = 5 if desk else 3                     # every game it plays, then its colour tile
    for i in range(0, len(GAMES), per):
        caps(d, (x0, int(y)), "  ".join(n for n, _ in GAMES[i:i + per]), small, SUB + (230,)); y += small * 1.6
    row = "".join(f'<rect x="{n * g * 1.3}" width="{g}" height="{g}" rx="{g * .24}" fill="{c}"/>' for n, (_, c) in enumerate(GAMES))
    img.alpha_composite(svg_png(row, int(g * 1.3 * len(GAMES)), g), (x0, int(y + small)))
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
        oni(kind).save(OUT / f"oni-{kind}.png", optimize=True)
    print("\n".join(str(p) for p in sorted(OUT.glob("*.png"))))

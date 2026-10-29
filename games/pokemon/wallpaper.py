"""Stitch's run as an iPhone wallpaper (1320x2868): the live game screen in a Sapphire text box under the clock,
then the party and badges. Saved to the top of iCloud Drive, where Files shows it first.
python3 wallpaper.py [screen.png] [out.jpg]"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import graph
from graph import box, text, NAVY, GOLD, DIM, EDGE, TYPE, OTHER

OUT = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Pokemon Wallpaper.jpg"
W, H, SCALE = 264, 574, 5     # 1320 x 2870 at 5x, cropped to 2868


def draw(screen, out=OUT):
    rows = graph.rows()
    last = rows[-1] if rows else dict(playMin=0, badges=0, caught=0, money=0, party=[], place="?", note="")
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    f = ImageFont.load_default_imagefont()

    # The lock screen clock covers roughly the top quarter; the game sits just under it.
    box(d, 6, 196, W - 7, 196 + 160 + 13)
    img.paste(Image.open(screen).convert("RGB").resize((240, 160), Image.NEAREST), (12, 202))

    y = 382
    box(d, 6, y, W - 7, y + 20 + 14 * max(1, len(last["party"])))
    text(d, (14, y + 7), "STITCH", f)
    hrs = f"{last['playMin'] // 60}:{last['playMin'] % 60:02d}"
    text(d, (W - 14 - f.getbbox(hrs)[2], y + 7), hrs, f)
    for i, (n, lv) in enumerate(last["party"]):
        col = TYPE.get(n, OTHER[i % len(OTHER)])
        text(d, (14, y + 22 + i * 14), n.upper(), f, col)
        text(d, (W - 14 - f.getbbox(f"L{lv}")[2], y + 22 + i * 14), f"L{lv}", f, col)

    y = H - 92
    box(d, 6, y, W - 7, y + 56)
    for i in range(8):
        d.regular_polygon((26 + i * 30, y + 16, 9), 8, fill=GOLD if i < last["badges"] else DIM, outline=EDGE)
    text(d, (14, y + 34), f"DEX {last['caught']}", f)
    text(d, (W - 14 - f.getbbox(last["place"].upper())[2], y + 34), last["place"].upper(), f)

    big = img.resize((W * SCALE, H * SCALE), Image.NEAREST).crop((0, 0, 1320, 2868))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    big.save(out, quality=92)
    return out


if __name__ == "__main__":
    print(draw(*sys.argv[1:]))

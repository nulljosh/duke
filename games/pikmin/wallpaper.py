"""The Pikmin 2 run as an iPhone wallpaper (1320x2868): the live game screen under the lock screen clock, then the
Pikmin, treasure and Poko counts from progress.jsonl. Saved to the top of iCloud Drive, where Files shows it first.
python3 wallpaper.py [screen.png] [out.jpg]"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

import graph
from graph import BG, PANEL, INK, DIM, RED, GOLD, GOAL, font

OUT = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Pikmin Wallpaper.jpg"
W, H = 1320, 2868


def draw(screen, out=OUT):
    rows = graph.rows()
    last = rows[-1] if rows else dict(day=1, pikmin=0, treasures=0, poko=0, pct=0, note="")
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # The clock covers roughly the top quarter; the game sits just under it.
    shot = Image.open(screen).convert("RGB")
    sw = W - 96
    shot = shot.resize((sw, sw * shot.height // shot.width))
    y = 820
    d.rounded_rectangle([32, y - 16, W - 32, y + shot.height + 16], 56, fill=PANEL)
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, *shot.size], 44, fill=255)
    img.paste(shot, (48, y), mask)

    y += shot.height + 72
    big, mid = font(120), font(56)
    cards = [("Pikmin", str(last["pikmin"]), RED), ("Treasures", f"{last['treasures']}/{GOAL}", GOLD),
             ("Day", str(last["day"]), INK)]
    cw = (W - 64 - 2 * 32) // 3
    for i, (label, v, c) in enumerate(cards):
        x = 32 + i * (cw + 32)
        d.rounded_rectangle([x, y, x + cw, y + 300], 56, fill=PANEL)
        d.text((x + 40, y + 40), label, font=mid, fill=DIM)
        d.text((x + 40, y + 120), v, font=big, fill=c)
    y += 360
    d.text((48, y), f"{last['pct']}% done  ·  {last['poko']:,} of 10,000 Poko", font=mid, fill=DIM)
    d.text((48, y + 90), last["note"], font=mid, fill=INK)

    Path(out).parent.mkdir(parents=True, exist_ok=True)
    img.save(out, quality=92)
    return out


if __name__ == "__main__":
    print(draw(*sys.argv[1:]))

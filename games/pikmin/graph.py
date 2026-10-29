"""The Pikmin 2 run as one picture: Pikmin count and treasures over the run, the latest note under it.
python3 graph.py [out.png]"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
W, H = 960, 540
BG, PANEL, INK, DIM, GRID = (18, 34, 24), (28, 52, 36), (240, 244, 236), (150, 170, 150), (44, 72, 52)
RED, GOLD = (226, 62, 52), (246, 196, 60)
GOAL = 201                                     # treasures in the game


def rows():
    p = HERE / "progress.jsonl"
    return [json.loads(l) for l in p.read_text().splitlines()] if p.exists() else []


def font(size):
    for f in ("/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw(out):
    data = rows()
    last = data[-1] if data else dict(day=1, pikmin=0, treasures=0, poko=0, pct=0, note="")
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    big, mid, small = font(40), font(24), font(18)
    d.text((40, 32), "Pikmin 2", font=big, fill=INK)
    d.text((40, 84), f"Day {last['day']}  ·  {last['pct']}% done", font=mid, fill=DIM)
    for i, (label, v, c) in enumerate([("Pikmin", last["pikmin"], RED), ("Treasures", f"{last['treasures']}/{GOAL}", GOLD),
                                       ("Poko", f"{last['poko']:,}/10,000", INK)]):
        x = W - 40 - (2 - i) * 190 - 170
        d.rounded_rectangle([x, 32, x + 170, 112], 20, fill=PANEL)
        d.text((x + 16, 40), label, font=small, fill=DIM)
        d.text((x + 16, 64), str(v), font=mid, fill=c)

    x0, y0, x1, y1 = 80, 150, W - 40, H - 90
    d.rounded_rectangle([40, 136, W - 40, H - 76], 28, fill=PANEL)
    t0 = data[0]["t"] if data else 0
    tmax = max([(r["t"] - t0) / 60 for r in data] + [30])
    nmax = max([r["pikmin"] for r in data] + [20])
    nmax = -(-nmax // 10) * 10
    for v in range(0, nmax + 1, max(5, nmax // 4)):
        y = y1 - (y1 - y0) * v / nmax
        d.line([(x0, y), (x1 - 20, y)], fill=GRID)
        d.text((x0 - 30, y - 10), str(v), font=small, fill=DIM)
    pt = lambda r, k, top: (x0 + (x1 - 20 - x0) * (r["t"] - t0) / 60 / tmax, y1 - (y1 - y0) * r[k] / top)
    for k, c, top in (("treasures", GOLD, nmax), ("pikmin", RED, nmax)):
        ps = [pt(r, k, top) for r in data]
        if len(ps) > 1:
            d.line(ps, fill=c, width=5, joint="curve")
        for x, y in ps[-1:]:
            d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=c)
    d.text((x1 - 140, y1 + 4), f"{tmax:.0f} min", font=small, fill=DIM)
    d.text((40, H - 56), last["note"], font=mid, fill=INK)
    img.save(out)


if __name__ == "__main__":
    draw(sys.argv[1] if len(sys.argv) > 1 else HERE / "progress.png")

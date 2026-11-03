"""The Pikmin 2 run as one picture: four stat tiles, then Pikmin and treasures over bot hours, the latest note under it.
python3 graph.py [out.png]

Time is bot hours, not wall clock: a gap between rows counts at most one hour (the bot parked overnight is not play),
the same rule forecast.py and bench.py use, so all three agree on the pace."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
W, H = 960, 540
# Garden theme: forest-floor green, moss panels, cream ink, Pikmin-colour accents. Original drawing only, no game art.
BG, PANEL, INK, DIM, GRID = (18, 30, 22), (30, 46, 33), (246, 240, 222), (168, 184, 158), (50, 70, 52)
RED, GOLD, BLUE, PURPLE, LEAF = (232, 64, 52), (250, 200, 64), (90, 150, 255), (170, 110, 230), (120, 200, 90)


def sprout(d, x, y, s=1.0, bud=RED):
    """A little sprout: curved stem, one leaf, a bud on top. Drawn from shapes, nothing traced."""
    d.line([(x, y + 34 * s), (x + 2 * s, y + 14 * s), (x, y)], fill=LEAF, width=max(2, int(3 * s)), joint="curve")
    d.polygon([(x + 2 * s, y + 18 * s), (x + 18 * s, y + 8 * s), (x + 22 * s, y + 16 * s), (x + 6 * s, y + 22 * s)], fill=LEAF)
    d.ellipse([x - 6 * s, y - 10 * s, x + 6 * s, y + 2 * s], fill=bud)
GOAL = 201                                     # treasures in the game


def rows():
    p = HERE / "progress.jsonl"
    return [json.loads(l) for l in p.read_text().splitlines()] if p.exists() else []


def bot_hours(data):
    """Cumulative bot hours at each row (gaps capped at 1 h)."""
    out, t = [], 0.0
    for i, r in enumerate(data):
        if i:
            t += min(r["t"] - data[i - 1]["t"], 3600) / 3600
        out.append(t)
    return out


def font(size):
    for f in ("/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def nice(top, steps=4):
    """A round axis top and step: 24 -> (40, 10), 5 -> (8, 2)."""
    for s in (1, 2, 5, 10, 20, 25, 50, 100):
        if top <= s * steps:
            return s * steps, s
    return top, top // steps


def panel(d, box, xs, ys, color, label, tmax, small, show_x):
    x0, y0, x1, y1 = box
    top, step = nice(max(ys + [4]))
    d.text((x0, y0 - 26), label, font=small, fill=color)
    for v in range(0, top + 1, step):
        y = y1 - (y1 - y0) * v / top
        d.line([(x0 + 34, y), (x1, y)], fill=GRID)
        d.text((x0, y - 10), str(v), font=small, fill=DIM)
    px = lambda t: x0 + 34 + (x1 - x0 - 34) * t / tmax
    pts = [(px(t), y1 - (y1 - y0) * v / top) for t, v in zip(xs, ys)]
    if len(pts) > 1:                           # steps, not slopes: counts change at events, not smoothly
        stair = [pts[0]]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            stair += [(bx, ay), (bx, by)]
        d.line(stair, fill=color, width=4)
    x, y = pts[-1]
    d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=color)
    if show_x:
        tstep = nice(tmax, 5)[1]
        for h in range(0, int(tmax) + 1, max(1, tstep)):
            d.text((px(h) - 6, y1 + 6), f"{h}h" if h else "0", font=small, fill=DIM)
    return px


def draw(out):
    data = rows() or [dict(t=0, day=1, pikmin=0, treasures=0, poko=0, pct=0, note="")]
    last, hrs = data[-1], bot_hours(data)
    pace = last["treasures"] / max(hrs[-1], 0.01)
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    big, mid, small = font(40), font(24), font(16)
    sprout(d, 50, 40, 1.0, RED)
    d.text((76, 32), "Pikmin 2", font=big, fill=INK)
    d.text((76, 84), f"Day {last['day']}  ·  {100 * last['treasures'] / GOAL:.1f}% done", font=mid, fill=DIM)
    tiles = [("Pikmin", last["pikmin"], RED), ("Treasures", f"{last['treasures']}/{GOAL}", GOLD),
             ("Poko", f"{last['poko']:,}", INK), ("Pace", f"{pace:.2f}/h", INK)]
    for i, (label, v, c) in enumerate(tiles):
        x = W - 40 - (len(tiles) - i) * 150 + 10
        d.rounded_rectangle([x, 32, x + 140, 112], 20, fill=PANEL)
        d.text((x + 14, 42), label, font=small, fill=DIM)
        d.text((x + 14, 66), str(v), font=mid, fill=c)

    d.rounded_rectangle([40, 132, W - 40, H - 72], 28, fill=PANEL)
    tmax = max(hrs[-1], 1.0)
    panel(d, (64, 172, W - 70, 270), hrs, [r["pikmin"] for r in data], RED, "Pikmin alive", tmax, small, False)
    px = panel(d, (64, 330, W - 70, 430), hrs, [r["treasures"] for r in data], GOLD, "Treasures home", tmax, small, True)
    seen, lastx = set(), -99                   # day markers: a faint rule where each new day's first row lands,
    for t, r in zip(hrs, data):                # labelled in the gap between the panels, skipped when crowded
        if r["day"] not in seen:
            seen.add(r["day"])
            d.line([(px(t), 172), (px(t), 430)], fill=(48, 48, 54))
            if px(t) - lastx > 34:
                d.text((px(t) + 4, 278), f"D{r['day']}", font=small, fill=DIM)
                lastx = px(t)
    for i, c in enumerate((RED, GOLD, BLUE, PURPLE)):   # a row of sprouts by the captain's log line
        sprout(d, 52 + i * 16, H - 52, 0.55, c)
    d.text((124, H - 54), last["note"][:80], font=mid, fill=INK)
    img.save(out)


if __name__ == "__main__":
    draw(sys.argv[1] if len(sys.argv) > 1 else HERE / "progress.png")

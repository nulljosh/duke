"""Stitch's run, drawn like the game: Sapphire text boxes on navy, a pixel font, scaled 3x with no smoothing.
python3 graph.py [out.png]"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
W, H, SCALE = 320, 214, 3
NAVY, INK, SHADOW, EDGE, RIM, PAPER = (32, 56, 104), (64, 64, 64), (200, 200, 208), (80, 96, 120), (168, 184, 208), (248, 248, 248)
GRID, GOLD, DIM = (224, 228, 236), (248, 200, 48), (200, 204, 212)
TYPE = {"TREECKO": (88, 176, 72), "GROVYLE": (88, 176, 72), "SCEPTILE": (88, 176, 72)}
OTHER = [(232, 96, 64), (64, 136, 232), (200, 120, 200), (232, 168, 48), (120, 120, 120)]


def box(d, x0, y0, x1, y1):
    """A Ruby/Sapphire text box: white, a dark outer edge, a pale rim, clipped corners."""
    d.rectangle([x0 + 1, y0, x1 - 1, y1], fill=EDGE)
    d.rectangle([x0, y0 + 1, x1, y1 - 1], fill=EDGE)
    d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], fill=RIM)
    d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=PAPER)


def text(d, xy, s, font, fill=INK):
    """Game text has a grey drop shadow down and right."""
    d.text((xy[0] + 1, xy[1] + 1), s, fill=SHADOW, font=font)
    d.text(xy, s, fill=fill, font=font)


def rows():
    p = HERE / "progress.jsonl"
    return [json.loads(l) for l in p.read_text().splitlines()] if p.exists() else []


def draw(out):
    data = rows()
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    f = ImageFont.load_default_imagefont()
    last = data[-1] if data else dict(playMin=0, badges=0, caught=0, money=0, party=[], place="?")

    box(d, 4, 4, W - 5, 24)
    text(d, (10, 9), "STITCH  -  POKEMON SAPPHIRE", f)
    hrs = f"{last['playMin'] // 60}:{last['playMin'] % 60:02d}"
    text(d, (W - 10 - f.getbbox(hrs)[2], 9), hrs, f)

    # Levels by play time, one line per party member.
    x0, y0, x1, y1 = 8, 30, W - 9, 140
    box(d, x0, y0, x1, y1)
    text(d, (x0 + 7, y0 + 5), "LEVEL", f)
    px0, py0, px1, py1 = x0 + 26, y0 + 26, x1 - 16, y1 - 16
    tmax = max([r["playMin"] for r in data] + [60])
    lmax = max([lv for r in data for _, lv in r["party"]] + [10])
    lmax = -(-lmax // 10) * 10
    for v in range(0, lmax + 1, max(10, lmax // 5 // 10 * 10)):
        yy = py1 - (py1 - py0) * v / lmax
        d.line([(px0, yy), (px1, yy)], fill=GRID)
        text(d, (x0 + 6, yy - 5), str(v), f)
    for m in range(0, tmax + 1, max(15, tmax // 6 // 15 * 15)):
        xx = px0 + (px1 - px0) * m / tmax
        lab = f"{m // 60}:{m % 60:02d}"
        text(d, (min(xx - 6, x1 - 6 - f.getbbox(lab)[2]), py1 + 3), lab, f)
    names = []
    for r in data:
        for n, _ in r["party"]:
            if n not in names:
                names.append(n)
    for i, n in enumerate(names):
        col = TYPE.get(str(n).upper(), OTHER[i % len(OTHER)])
        pts = [(px0 + (px1 - px0) * r["playMin"] / tmax, py1 - (py1 - py0) * lv / lmax)
               for r in data for nn, lv in r["party"] if nn == n]
        if len(pts) > 1:
            d.line(pts, fill=col, width=2)
        for x, y in pts:
            d.rectangle([x - 2, y - 2, x + 2, y + 2], fill=col)
        lv = [lv for nn, lv in last["party"] if nn == n]
        label = f"{n.upper()} L{lv[0]}" if lv else n.upper()
        text(d, (x1 - 8 - f.getbbox(label)[2], y0 + 5 + i * 11), label, f, col)

    # Badges, dex and money, like the trainer card.
    x0, y0, x1, y1 = 8, 146, W - 9, H - 5
    box(d, x0, y0, x1, y1)
    text(d, (x0 + 7, y0 + 6), "BADGES", f)
    for i in range(8):
        cx, cy = x0 + 64 + i * 16, y0 + 11
        d.regular_polygon((cx, cy, 6), 8, fill=GOLD if i < last["badges"] else DIM, outline=EDGE)
    text(d, (x0 + 200, y0 + 6), f"DEX {last['caught']}", f)
    text(d, (x0 + 248, y0 + 6), f"${last['money']:,}", f)
    text(d, (x0 + 7, y0 + 24), f"NOW  {last['place'].upper()}", f)
    note = next((r["note"] for r in reversed(data) if r.get("note")), "")
    text(d, (x0 + 7, y0 + 40), note.upper()[:48], f, (96, 96, 112))

    img = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
    img.save(out)
    return out


if __name__ == "__main__":
    print(draw(sys.argv[1] if len(sys.argv) > 1 else str(HERE / "progress.png")))

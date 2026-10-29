"""Colony 1 against colony 2, cycle by cycle: dupes alive and food in stock, from progress.jsonl. python3 graph.py [out.png]"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
COLOURS = {1: (176, 96, 80), 2: (70, 140, 200), 3: (90, 160, 90), 4: (200, 150, 40), 5: (140, 90, 190), 6: (40, 40, 40), 7: (210, 70, 60)}


def runs():
    by = {}
    for line in (HERE / "progress.jsonl").read_text().splitlines():
        r = json.loads(line); by[(r.get("colony", 1), r["cycle"])] = r   # a reload repeats a cycle; keep the last row
    out = {}
    for (c, cyc), r in sorted(by.items()): out.setdefault(c, []).append(r)
    return out


def panel(d, box, title, key, top, data, font):
    x0, y0, x1, y1 = box; d.text((x0, y0 - 26), title, fill=(30, 30, 30), font=font)
    d.line([(x0, y1), (x1, y1)], fill=(120, 120, 120)); d.line([(x0, y0), (x0, y1)], fill=(120, 120, 120))
    for v in (0, top // 2, top): yy = y1 - (y1 - y0) * v / top; d.text((x0 - 70, yy - 12), f"{v:,}", fill=(90, 90, 90), font=font); d.line([(x0, yy), (x1, yy)], fill=(225, 223, 218))
    last = max(r["cycle"] for rows in data.values() for r in rows)
    for k in range(0, last + 1, 5): x = x0 + (x1 - x0) * k / last; d.text((x - 4, y1 + 6), str(k), fill=(90, 90, 90), font=font)
    for c, rows in data.items():
        pts = [(x0 + (x1 - x0) * r["cycle"] / last, y1 - (y1 - y0) * min(r[key], top) / top) for r in rows]
        d.line(pts, fill=COLOURS.get(c, (0, 0, 0)), width=4)
        for p in pts: d.ellipse([p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4], fill=COLOURS.get(c, (0, 0, 0)))


def draw(out):
    data = runs(); img = Image.new("RGB", (1200, 760), (250, 249, 246)); d = ImageDraw.Draw(img)
    try: font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
    except OSError: font = ImageFont.load_default()
    d.text((60, 20), "Oxygen Not Included, cycle by cycle", fill=(20, 20, 20), font=font)
    for i, (c, col) in enumerate(COLOURS.items()): d.rectangle([420 + i * 100, 26, 440 + i * 100, 40], fill=col); d.text((446 + i * 100, 20), f"colony {c}", fill=(40, 40, 40), font=font)
    top = max(16000, max(r["foodKcal"] for rows in data.values() for r in rows))
    panel(d, (110, 110, 1140, 360), "Dupes alive", "dupes", 6, data, font)
    panel(d, (110, 450, 1140, 700), "Food in stock (kcal, game meter)", "foodKcal", -(-top // 10000) * 10000, data, font)
    img.save(out); return out


if __name__ == "__main__":
    print(draw(sys.argv[1] if len(sys.argv) > 1 else "/tmp/oni-graph.png"))

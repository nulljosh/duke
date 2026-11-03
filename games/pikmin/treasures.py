"""All 201 treasures as a checklist, one row per area or cave, a filled sprout for each one home.
python3 treasures.py [out.png]   reads treasures.json (the list) and collected.json (names brought home so far)
python3 treasures.py add NAME    marks one home and redraws"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw
from graph import BG, PANEL, INK, DIM, GRID, GOLD, LEAF, font, sprout

HERE = Path(__file__).resolve().parent
W, H = 960, 600


def load():
    items = json.loads((HERE / "treasures.json").read_text())
    got = set(json.loads((HERE / "collected.json").read_text())) if (HERE / "collected.json").exists() else set()
    return items, got


def draw(out):
    items, got = load()
    areas = list(dict.fromkeys(t["place"] if t["place"] != "overground" else t["area"] for t in items))
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    big, mid, small = font(36), font(22), font(15)
    done = sum(1 for t in items if t["name"] in got)
    sprout(d, 50, 32, 0.9, GOLD)
    d.text((74, 26), "Treasure hoard", font=big, fill=INK)
    d.text((74, 70), f"{done} of {len(items)} home  ·  {sum(t['value'] or 0 for t in items if t['name'] in got):,} Poko of treasure",
           font=mid, fill=DIM)
    d.rounded_rectangle([30, 108, W - 30, H - 20], 24, fill=PANEL)
    row_h = (H - 140) / len(areas)
    for r, area in enumerate(areas):
        y = 124 + r * row_h
        row = [t for t in items if (t["place"] if t["place"] != "overground" else t["area"]) == area]
        n = sum(1 for t in row if t["name"] in got)
        d.text((48, y), area, font=small, fill=INK if n else DIM)
        d.text((232, y), f"{n}/{len(row)}", font=small, fill=GOLD if n == len(row) else DIM)
        for i, t in enumerate(row):
            cx, cy = 290 + i * 30, y + 9
            if t["name"] in got:
                d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=GOLD)
                d.line([(cx - 4, cy), (cx - 1, cy + 4), (cx + 5, cy - 4)], fill=PANEL, width=2)
            else:
                d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], outline=GRID, width=2)
    img.save(out)
    return done


if __name__ == "__main__":
    if sys.argv[1:2] == ["add"]:
        items, got = load()
        name = " ".join(sys.argv[2:])
        assert any(t["name"] == name for t in items), f"not in treasures.json: {name}"
        (HERE / "collected.json").write_text(json.dumps(sorted(got | {name}), indent=1) + "\n")
        sys.argv = sys.argv[:1]
    print(draw(sys.argv[1] if len(sys.argv) > 1 else HERE / "treasures.png"), "home")

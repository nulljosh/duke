"""Top-down map of the current area from RAM: carry-route graph (grey; red = closed gate node, blue = water),
gates/bags (red squares), caves (green), treasures (gold), live non-harmless enemies (magenta), Pikmin (white),
the captain (cyan) and the landing spot. python3 areamap.py [out.png]"""
import sys
from PIL import Image, ImageDraw
import pk2

out = sys.argv[1] if len(sys.argv) > 1 else "shots/areamap.png"
w = pk2.waypoints()
pts = [(v[0], v[1]) for v in w.values()]
for k in ("gate", "cave"):
    pts += pk2.items(k)
xs, zs = [p[0] for p in pts], [p[1] for p in pts]
x0, x1, z0, z1 = min(xs) - 200, max(xs) + 200, min(zs) - 200, max(zs) + 200
S = 900 / max(x1 - x0, z1 - z0)
P = lambda x, z: ((x - x0) * S + 20, (z - z0) * S + 20)
im = Image.new("RGB", (int((x1 - x0) * S) + 40, int((z1 - z0) * S) + 60), (18, 22, 20))
d = ImageDraw.Draw(im)
raw = pk2.waypoints.__wrapped__() if hasattr(pk2.waypoints, "__wrapped__") else None
for i, v in w.items():
    for j in v[4]:
        if j in w:
            d.line([P(v[0], v[1]), P(w[j][0], w[j][1])], fill=(90, 100, 95), width=2)
for v in w.values():
    c = (220, 60, 60) if v[3] & 1 else (70, 140, 230) if v[3] & 2 else (130, 140, 135)
    x, y = P(v[0], v[1]); d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=c)
dot = lambda p, c, r, t="": (d.rectangle if t == "sq" else d.ellipse)([P(*p)[0] - r, P(*p)[1] - r, P(*p)[0] + r, P(*p)[1] + r], fill=c)
for g in pk2.items("gate"): dot(g, (230, 50, 50), 7, "sq"); d.text((P(*g)[0] + 9, P(*g)[1] - 6), f"{g[0]:.0f},{g[1]:.0f}", fill=(230, 120, 120))
for c in pk2.items("cave"): dot(c, (60, 200, 90), 8); d.text((P(*c)[0] + 9, P(*c)[1] - 6), f"cave {c[0]:.0f},{c[1]:.0f}", fill=(120, 230, 140))
for t in pk2.pellets("treasure"): dot((t["x"], t["z"]), (240, 200, 60), 6)
for e in pk2.enemies():
    if e["id"] not in pk2.HARMLESS and e["hp"] > 0: dot((e["x"], e["z"]), (220, 70, 220), 4)
for p in pk2.pikis(): dot(p, (240, 240, 240), 2)
dot((512, 2662), (255, 255, 255), 6, "sq"); d.text((P(512, 2662)[0] + 9, P(512, 2662)[1]), "ship", fill=(255, 255, 255))
dot(pk2.pos(), (60, 230, 230), 6)
d.text((20, im.height - 30), "red sq gate/bag  green cave  gold treasure  magenta enemy  white Pikmin  cyan captain  red dot closed  blue dot water", fill=(200, 200, 200))
im.save(out); print(out)

"""Kill one fire geyser with Reds only, the purples kept 180 back in the squad, out of the flames.
Holding A and pressing D-pad right switches the colour thrown, and the choice sticks (tested 2026-11-03), so one test
throw onto safe ground sideways picks Red before any throw goes near the fire.
  python3 geyser.py X Z      exit 0 dead, 4 still burning, 3 a loss"""
import math
import sys
import time
import pk2

GX, GZ = float(sys.argv[1]), float(sys.argv[2])
pad = pk2.Pad()
a0 = pk2.alive()


def hp():
    es = [e for e in pk2.enemies() if e["id"] == 20 and e["hp"] > 0 and math.hypot(e["x"] - GX, e["z"] - GZ) < 40]
    return es[0]["hp"] if es else 0


def landed(x, z):
    return {k: sum(1 for p in pk2.pikis(k) if math.hypot(p[0] - x, p[1] - z) < 45) for k in (1, 3)}


# pick Red first, right here on ground we are already standing on: a test throw straight ahead (no walking to a
# side spot, which circled into a wall on HoB 3), toggled with A + D-pad right until a Red lands
for i in range(3):
    cx, _, cz = pk2.cursor()
    before = landed(cx, cz)
    if i == 0:
        pad.press("A", 80, after=1.2)
    else:
        pad.cmd("hold A"); time.sleep(0.4); pad.press("E", 80, after=0.3); pad.cmd("release all"); time.sleep(1.2)
    after = landed(cx, cz)
    print("test throw", i, before, "->", after, flush=True)
    if after[1] > before[1]:
        print("red selected", flush=True)
        break
else:
    print("could not select red", flush=True)
    sys.exit(4)
pad.press("B", 1500, after=1)                  # whistle the test throws back
me = pk2.pos()
d = math.hypot(me[0] - GX, me[1] - GZ) or 1
stand = (GX + (me[0] - GX) / d * 180, GZ + (me[1] - GZ) / d * 180)
pk2.nav(pad, *stand, near=30, guard=False)
budget = len(pk2.pikis(1)) - 2                 # never throw more than the Reds we have: the next one is a purple
for v in range(10):
    h = hp()
    if not h:
        break
    if pk2.alive() < a0 - pk2.TOL if hasattr(pk2, "TOL") else pk2.alive() < a0:
        sys.exit(3)
    pk2.aim(pad, GX, GZ)
    reds = min(5, budget)
    budget -= reds
    for _ in range(reds):
        pad.press("A", 80, after=0.35)
    print("volley", v, "hp", round(h), flush=True)
    time.sleep(4)
pk2.nav(pad, *stand, near=30, guard=False)
pad.press("B", 2000, after=1)                  # call the Reds back from the dead geyser
print("geyser hp", round(hp()), "squad", pk2.squad(0), "alive", pk2.alive(), flush=True)
sys.exit(3 if pk2.alive() < a0 else 0 if not hp() else 4)

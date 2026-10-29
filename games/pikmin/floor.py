"""One cave floor: whistle the squad in, kill what's close, send Pikmin to every treasure, wait for each one to reach
the pod, then walk into the hole and go down. Time doesn't pass in caves, so there's no rush here.
python3 floor.py [down]   with 'down' it also takes the hole at the end."""
import math
import sys
import time

import pk2

pk2.ITEM_MGRS.update(hole=0x805167C8)
SKIP = {0, 88, 91}
pad = pk2.Pad()


def regroup():
    for _ in range(4):
        if pk2.squad(0) >= pk2.alive() - 1:
            break
        pk2.gather(pad)
    print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)


def fight(r=500):
    me = pk2.pos()
    for e in [e for e in pk2.enemies() if e["id"] not in SKIP and e["hp"] > 0
              and math.hypot(e["x"] - me[0], e["z"] - me[1]) < r]:
        print("fight", e["id"], round(e["x"]), round(e["z"]), flush=True)
        for _ in range(8):
            live = [f for f in pk2.enemies() if f["id"] == e["id"] and f["hp"] > 0
                    and math.hypot(f["x"] - e["x"], f["z"] - e["z"]) < 200]
            if not live:
                break
            if pk2.squad(0):
                pk2.throw_at(pad, live[0]["x"], live[0]["z"], n=pk2.squad(0))
            time.sleep(4)
        regroup()


regroup()
def loot():
    """Treasures plus item pellets: upgrades like the Spherical Atlas come through the item manager."""
    return [dict(p, kind=k) for k in ("treasure", "item") for p in pk2.pellets(k)]


for t in loot():
    print("treasure", t["i"], round(t["x"]), round(t["z"]), flush=True)
    pk2.travel(pad, t["x"], t["z"], near=150)
    fight()
    for _ in range(20):
        if not any(p["i"] == t["i"] and math.hypot(p["x"] - t["x"], p["z"] - t["z"]) < 50 for p in pk2.pellets(t["kind"])):
            break                              # it moved: they're carrying it
        if pk2.squad(0):
            pk2.throw_at(pad, t["x"], t["z"], n=min(pk2.squad(0), 15))
        time.sleep(3)
t0 = time.time()
while loot() and time.time() - t0 < 180:   # carriers walking to the pod
    time.sleep(5)
print("treasures left", len(loot()), flush=True)
regroup()
if sys.argv[1:] == ["down"]:
    hole = pk2.items("hole")[0]
    print("hole", pk2.travel(pad, *hole, near=80), flush=True)
    w = pk2.Walker(pad)
    for _ in range(6):                         # the hole sits on a mound; goto stalls on its rim, so push on
        w.toward(*hole, 0.4)
    pad.press("A", after=2)                    # "Delve deeper?" opens on Yes
    pad.press("A", after=15)
    print(pk2.shot("hole"), flush=True)

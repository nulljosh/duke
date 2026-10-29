"""Day 3: from the crushed bag, fight south past the Bulborbs to the white bramble gate (-591, 1427) and break it.
Enemy ids 0 (posy), 88 and 91 (props with 1100 hp) are left alone; anything else within reach gets the squad."""
import math
import time

import pk2

GATE = (-591, 1427)
SKIP = {0, 88, 91}
pad = pk2.Pad()


def regroup(x, z):
    for _ in range(3):
        pk2.whistle_at(pad, x, z, ms=2500)
        if pk2.squad(0) >= pk2.alive() - 2:
            break
    print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)


def fight(r=450):
    me = pk2.pos()
    foes = [e for e in pk2.enemies() if e["id"] not in SKIP and math.hypot(e["x"] - me[0], e["z"] - me[1]) < r]
    for e in sorted(foes, key=lambda e: math.hypot(e["x"] - me[0], e["z"] - me[1])):
        print("fight", e["id"], round(e["x"]), round(e["z"]), flush=True)
        for _ in range(8):
            live = [f for f in pk2.enemies() if f["id"] == e["id"] and math.hypot(f["x"] - e["x"], f["z"] - e["z"]) < 200]
            if not live:
                break
            if pk2.squad(0):
                pk2.throw_at(pad, live[0]["x"], live[0]["z"], n=pk2.squad(0))
            time.sleep(4)
        regroup(e["x"], e["z"])


regroup(-1150, 2455)
for x, z in pk2.route(pk2.waypoints(), pk2.pos(), GATE)[:-1]:
    fight()
    print("wp", round(x), round(z), pk2.goto(pad, x, z, near=45), flush=True)
fight()
pk2.travel(pad, *GATE, near=120)
t0 = time.time()
while GATE in [(round(x), round(z)) for x, z in pk2.items("gate")] and time.time() - t0 < 240:
    if pk2.squad(0):
        print("gate throw", pk2.squad(0), round(pk2.throw_at(pad, *GATE, n=pk2.squad(0))), flush=True)
    time.sleep(5)
print("gate", "down" if time.time() - t0 < 240 else "still up", pk2.shot("gate"), flush=True)

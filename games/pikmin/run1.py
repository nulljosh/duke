"""Day 1: whistle the squad off the stuck Bulborb, walk the route graph to the nearest treasure, throw them on it."""
import math
import time

import pk2

pad = pk2.Pad()
print("gather", pk2.gather(pad), pk2.squad(), flush=True)
me = pk2.pos()
t = min(pk2.pellets(), key=lambda t: math.hypot(t["x"] - me[0], t["z"] - me[1]))
print("treasure", t, flush=True)
print("travel", pk2.travel(pad, t["x"], t["z"], near=110), pk2.pos(), flush=True)
print("miss", pk2.throw_at(pad, t["x"], t["z"], n=pk2.squad()), flush=True)
for _ in range(20):
    time.sleep(3)
    u = [p for p in pk2.pellets() if p["i"] == t["i"]]
    print("treasure now", u, flush=True)
print(pk2.shot("run1"))

"""Day 2, Olimar: grow to 36 Pikmin on the Red Onion at the landing site, for the 35-Pikmin bag at (-1150, 2455).
Same loop as farm.py: pluck, whistle, throw the squad at the posy nearest the Onion, let them carry, repeat."""
import math
import sys
import time

import pk2

pad = pk2.Pad()
GOAL = int(sys.argv[1]) if sys.argv[1:] else 36
ONION = (-230, 2792)
bad = set()
near = lambda p: math.hypot(p["x"] - ONION[0], p["z"] - ONION[1])
while pk2.alive() < GOAL:
    pk2.pluck(pad)
    if pk2.squad(0) < pk2.alive() - len(pk2.sprouts()):
        pk2.goto(pad, *ONION, near=60)
    pad.press("B", 1500, after=0.5)
    if pk2.squad(0) < pk2.alive() // 2:          # stragglers idle away from the Onion: walk over and whistle them
        ps = pk2.pikis()
        cx, cz = sum(p[0] for p in ps) / len(ps), sum(p[1] for p in ps) / len(ps)
        pk2.whistle_at(pad, cx, cz)
        pk2.goto(pad, *ONION, near=60)
    posies = [e for e in pk2.enemies() if e["id"] == 0] + pk2.pellets("number")
    posies = [p for p in posies if near(p) < 1300 and (round(p["x"]), round(p["z"])) not in bad]
    print("alive", pk2.alive(), "squad", pk2.squad(0), "posies", len(posies), flush=True)
    if not posies or not pk2.squad(0):
        time.sleep(10)
        continue
    t = min(posies, key=near)
    miss = pk2.throw_at(pad, t["x"], t["z"], n=min(10, pk2.squad(0)))
    print("throw", round(t["x"]), round(t["z"]), "miss", round(miss), flush=True)
    if miss > 100:
        bad.add((round(t["x"]), round(t["z"])))
        continue
    time.sleep(12)
print("goal", pk2.alive(), pk2.shot("farm2"), flush=True)

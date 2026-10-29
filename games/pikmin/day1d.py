"""Fetch the stragglers by where they actually stand (the Onion whistle missed them), pluck the last sprout, then
both captains throw everyone on the Courage Reactor."""
import math
import time

import pk2

R = (-1069, 3292)
pad = pk2.Pad()
pk2.ACTIVE = 0
for x, z in sorted(pk2.pikis(), key=lambda p: -p[1]):
    if math.hypot(x - R[0], z - R[1]) > 300:      # not already at the reactor
        print("fetch", round(x), round(z), pk2.travel(pad, x, z, near=60), flush=True)
        pk2.whistle_at(pad, x, z, ms=2000)
for _ in range(3):
    pk2.NOPLUCK.clear()
    for x, z in pk2.sprouts():
        pk2.goto(pad, x, z, near=4)
        pad.press("A", 100, after=1.5)
    if not pk2.sprouts():
        break
print("olimar squad", pk2.squad(0), "sprouts", len(pk2.sprouts()), flush=True)
print("to reactor", pk2.travel(pad, *R, near=110), flush=True)
print("miss", round(pk2.throw_at(pad, *R, n=pk2.squad(0))), flush=True)
pad.press("Y", 100, after=2.5)
pk2.ACTIVE = 1
print("miss", round(pk2.throw_at(pad, *R, n=pk2.squad(1))), flush=True)
for _ in range(100):
    time.sleep(3)
    if not [p for p in pk2.pellets() if p["i"] == 2]:
        print("delivered", flush=True)
        break
else:
    print("not moving", pk2.squad(0), pk2.squad(1), flush=True)
print(pk2.shot("day1d"), flush=True)

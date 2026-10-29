"""The last two sprouts are plucked: throw them on the reactor for 20/20 and wait for it to reach the ship."""
import time

import pk2

R = (-1069, 3292)
pad = pk2.Pad()
pk2.ACTIVE = 1
print("fetch", pk2.travel(pad, -229, 4082, near=60), flush=True)
pk2.whistle_at(pad, -229, 4082, ms=2500)
print("squad", pk2.squad(1), flush=True)
print("to reactor", pk2.travel(pad, *R, near=110), flush=True)
for _ in range(3):
    m = pk2.aim(pad, *R)
    if m < 100:
        for _ in range(pk2.squad(1)):
            pad.press("A", 80, after=0.8)
        print("thrown", round(m), "left", pk2.squad(1), flush=True)
        break
time.sleep(3)
print(pk2.shot("twenty"), flush=True)
for _ in range(60):
    time.sleep(3)
    if not [p for p in pk2.pellets() if p["i"] == 2]:
        print("delivered", flush=True)
        break
else:
    print("not moving", flush=True)
print(pk2.shot("day1i"), flush=True)

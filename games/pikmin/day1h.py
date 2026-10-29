"""Last three for the reactor (17/20): the Pikmin left in the hollow and the sprout by the Onion."""
import math
import time

import pk2

R = (-1069, 3292)
pad = pk2.Pad()
pk2.ACTIVE = 1
for x, z in [p for p in pk2.pikis() if math.hypot(p[0] - R[0], p[1] - R[1]) > 120]:
    print("fetch", round(x), round(z), pk2.travel(pad, x, z, near=60), flush=True)
    pk2.whistle_at(pad, x, z, ms=2500)
for x, z in pk2.sprouts():
    print("sprout", pk2.travel(pad, x, z, near=40), flush=True)
    pk2.goto(pad, x, z, near=4)
    pad.press("A", 100, after=1.5)
print("squad", pk2.squad(1), "sprouts", len(pk2.sprouts()), flush=True)
print("to reactor", pk2.travel(pad, *R, near=110), flush=True)
for _ in range(3):
    m = pk2.aim(pad, *R)
    if m < 100:
        for _ in range(pk2.squad(1)):
            pad.press("A", 80, after=0.6)
        print("thrown", round(m), flush=True)
        break
for _ in range(40):
    time.sleep(3)
    if not [p for p in pk2.pellets() if p["i"] == 2]:
        print("delivered", flush=True)
        break
else:
    print("not moving", flush=True)
print(pk2.shot("day1h"), flush=True)

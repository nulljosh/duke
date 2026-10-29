"""Louie's 11 onto the reactor, then Olimar fetches the three stuck at (-480, 3314) and the one by the Onion, plucks
the last sprout with an empty squad (A with Pikmin in hand throws one), and brings them all to the reactor."""
import time

import pk2

R = (-1069, 3292)
pad = pk2.Pad()
pad.press("Y", 100, after=2.5)
pk2.ACTIVE = 1
print("louie miss", round(pk2.throw_at(pad, *R, n=pk2.squad(1))), "left", pk2.squad(1), flush=True)
pad.press("Y", 100, after=2.5)
pk2.ACTIVE = 0
for x, z in [(-369, 3836)]:
    print("fetch", pk2.travel(pad, x, z, near=60), flush=True)
for x, z in pk2.sprouts():
    pk2.goto(pad, x, z, near=4)
    pad.press("A", 100, after=1.5)
pk2.whistle_at(pad, -369, 3836, ms=2500)
print("fetch", pk2.travel(pad, -480, 3314, near=60), flush=True)
pk2.whistle_at(pad, -480, 3314, ms=2500)
print("olimar squad", pk2.squad(0), "sprouts", len(pk2.sprouts()), flush=True)
print("to reactor", pk2.travel(pad, *R, near=110), flush=True)
print("olimar miss", round(pk2.throw_at(pad, *R, n=pk2.squad(0))), flush=True)
for _ in range(100):
    time.sleep(3)
    if not [p for p in pk2.pellets() if p["i"] == 2]:
        print("delivered", flush=True)
        break
else:
    print("not moving", pk2.squad(0), pk2.squad(1), flush=True)
print(pk2.shot("day1e"), flush=True)

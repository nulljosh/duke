"""Louie stays active (the second Y swap in day1e never landed): throw his 15 on the reactor for 18/20, walk to the
Onion with an empty squad, pluck the sprout, whistle whoever is there, bring them back and throw."""
import time

import pk2

R, SPROUT = (-1069, 3292), (-349, 3866)
pad = pk2.Pad()
pk2.ACTIVE = 1
while pk2.squad(1):
    print("miss", round(pk2.throw_at(pad, *R, n=pk2.squad(1))), "left", pk2.squad(1), flush=True)
print("to sprout", pk2.travel(pad, *SPROUT, near=40), flush=True)
for x, z in pk2.sprouts():
    pk2.goto(pad, x, z, near=4)
    pad.press("A", 100, after=1.5)
pk2.whistle_at(pad, *SPROUT, ms=3000)
print("squad", pk2.squad(1), "sprouts", len(pk2.sprouts()), pk2.shot("onion"), flush=True)
print("to reactor", pk2.travel(pad, *R, near=110), flush=True)
print("miss", round(pk2.throw_at(pad, *R, n=pk2.squad(1))), flush=True)
for _ in range(60):
    time.sleep(3)
    if not [p for p in pk2.pellets() if p["i"] == 2]:
        print("delivered", flush=True)
        break
else:
    print("not moving", flush=True)
print(pk2.shot("day1f"), flush=True)

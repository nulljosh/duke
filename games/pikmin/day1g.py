"""Louie walks his 14 back to the reactor and throws only when the cursor is really on it (day1f threw into a hollow
900 away when aim ran off)."""
import math
import time

import pk2

R = (-1069, 3292)
pad = pk2.Pad()
pk2.ACTIVE = 1
print("to reactor", pk2.travel(pad, *R, near=110), [round(v) for v in pk2.pos()], flush=True)
for _ in range(3):
    if math.hypot(pk2.pos()[0] - R[0], pk2.pos()[1] - R[1]) > 250:
        print("too far, stop", flush=True)
        break
    miss = pk2.aim(pad, *R)
    if miss < 100:
        for _ in range(pk2.squad(1)):
            pad.press("A", 80, after=0.35)
        print("thrown, miss", round(miss), "left", pk2.squad(1), flush=True)
        break
    print("aim miss", round(miss), flush=True)
print(pk2.shot("reactor18"), flush=True)

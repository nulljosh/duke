"""Crush the second paper bag (ItemDownFloor at -1150, 2455), which needs 35 Pikmin on top."""
import math
import time

import pk2

BAG = (-1150, 2455)
pad = pk2.Pad()
pad.press("B", 1500, after=0.5)
print("squad", pk2.squad(0), "travel", pk2.travel(pad, *BAG, near=120), [round(v) for v in pk2.pos()], flush=True)
print("throw miss", round(pk2.throw_at(pad, *BAG, n=pk2.squad(0))), flush=True)
for _ in range(10):                            # throws spill off the edge: whistle the spill and throw again
    time.sleep(4)
    if pk2.squad(0) == 0:
        break
    print("rethrow", pk2.squad(0), round(pk2.throw_at(pad, *BAG, n=pk2.squad(0))), flush=True)
time.sleep(8)
left = [e for e in pk2.enemies() if e["id"] == 91 and math.hypot(e["x"] - BAG[0], e["z"] - BAG[1]) < 250]
print("bag", "still there" if left else "crushed", left, pk2.shot("bag2b"), flush=True)

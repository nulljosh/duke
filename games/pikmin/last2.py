"""Day 1: Louie fetches the two Pikmin left by the Onion and throws them on the bag top (-980, 2852) for 15/15."""
import math
import time

import pk2

TOP = (-980, 2852)
pad = pk2.Pad()
pad.press("Y", 100, after=2.5)               # back to Louie
pk2.ACTIVE = 1
for x, z in [q for q in pk2.pikis() if q[1] > 3500]:
    print("fetch", round(x), round(z), pk2.travel(pad, x, z, near=90), flush=True)
    pk2.whistle_at(pad, x, z, ms=1500)
print("squad", pk2.squad(1), flush=True)
print("back", pk2.travel(pad, -1027, 2847, near=60), flush=True)
print("miss", round(pk2.throw_at(pad, *TOP, n=pk2.squad(1))), flush=True)
time.sleep(8)
left = [e for e in pk2.enemies() if e["id"] == 91 and math.hypot(e["x"] + 878, e["z"] - 2900) < 40]
print("bag", "still there" if left else "crushed", pk2.shot("bag5"), flush=True)

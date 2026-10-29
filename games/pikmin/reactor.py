"""Day 1: clear the reunion dialog, whistle everyone, carry the Courage Reactor (-1070, 3290) to the ship."""
import math
import time

import pk2

R = (-1070, 3290)
pad = pk2.Pad()
pk2.ACTIVE = 1                                  # Louie leads after the reunion (big icon, bottom left)
print("ctl", pk2.control(pad, 40), flush=True)
ps = pk2.pikis()
cx, cz = sum(q[0] for q in ps) / len(ps), sum(q[1] for q in ps) / len(ps)
print("to crew", pk2.travel(pad, cx, cz, near=110), flush=True)
for _ in range(3):
    pk2.whistle_at(pad, cx, cz, ms=2500)
print("squad", pk2.squad(0), pk2.squad(1), flush=True)
print("travel", pk2.travel(pad, *R, near=110), [round(v) for v in pk2.pos()], flush=True)
print("miss", round(pk2.throw_at(pad, *R, n=pk2.squad(pk2.ACTIVE))), flush=True)
for _ in range(60):
    time.sleep(3)
    left = [p for p in pk2.pellets() if p["i"] == 2]
    if not left:
        print("delivered", flush=True)
        break
    print("reactor at", round(left[0]["x"]), round(left[0]["z"]), flush=True)
print(pk2.shot("reactor"), flush=True)

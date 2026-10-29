"""Day 1, part two: the Courage Reactor needs 20 carriers and there are 16 Pikmin. Carry the Bulborb carcass to the
Onion for seeds, pluck them, then bring 20 back to the reactor and wait for it to reach the ship."""
import math
import time

import pk2

R, CARCASS, ONION = (-1069, 3292), (-752, 2841), (-340, 4000)
pad = pk2.Pad()
pk2.ACTIVE = 1


def crew_up(x, z):
    for _ in range(3):
        pk2.whistle_at(pad, x, z, ms=2500)
    print("squad", pk2.squad(1), flush=True)


crew_up(*R)
c = pk2.pellets("carcass")
if c:
    print("to carcass", pk2.travel(pad, c[0]["x"], c[0]["z"], near=110), flush=True)
    print("miss", round(pk2.throw_at(pad, c[0]["x"], c[0]["z"], n=pk2.squad(1))), flush=True)
    for _ in range(60):                         # carried home; its id frees when the Onion takes it
        time.sleep(3)
        if not pk2.pellets("carcass"):
            break
    print("carcass home", not pk2.pellets("carcass"), flush=True)
print("to onion", pk2.travel(pad, *ONION, near=120), flush=True)
time.sleep(5)
print("plucked", pk2.pluck(pad), "alive", pk2.alive(), flush=True)
crew_up(*ONION)
print("to reactor", pk2.travel(pad, *R, near=110), flush=True)
print("miss", round(pk2.throw_at(pad, *R, n=pk2.squad(1))), flush=True)
for _ in range(100):
    time.sleep(3)
    if not [p for p in pk2.pellets() if p["i"] == 2]:
        print("delivered", flush=True)
        break
print(pk2.shot("day1b"), flush=True)

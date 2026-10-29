"""Day 1, Louie: grow the squad on the Red Onion until there are 15 Pikmin. Pluck sprouts, throw the squad at the
nearest Pellet Posy (enemy id 0), let them carry the pellet home, repeat."""
import math
import time

import pk2

pk2.ACTIVE = 1
pad = pk2.Pad()
GOAL = 15
while pk2.alive() < GOAL:
    pk2.pluck(pad)
    time.sleep(1)
    pad.press("B", 1500, after=0.5)
    me = pk2.pos()
    posies = [e for e in pk2.enemies() if e["id"] == 0 and math.hypot(e["x"] - me[0], e["z"] - me[1]) < 900]
    print("alive", pk2.alive(), "squad", pk2.squad(1), "posies", len(posies), flush=True)
    if not posies or not pk2.squad(1):
        time.sleep(10)
        continue
    t = min(posies, key=lambda e: math.hypot(e["x"] - me[0], e["z"] - me[1]))
    print("throw", round(t["x"]), round(t["z"]), "miss", round(pk2.throw_at(pad, t["x"], t["z"], n=pk2.squad(1))), flush=True)
    time.sleep(15)                            # the posy dies, they carry the pellet to the Onion, seeds land
print("goal", pk2.alive(), pk2.shot("farm"))

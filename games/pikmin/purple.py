"""Spherical Atlas weighs 101: red Pikmin cap out at 100 carriers, so it needs purples (strength 10). The two Candypop
Buds on this floor (enemy id 82, Pom) turn each Pikmin thrown in into a purple seed, 5 per bud. Throw 5 reds into
each, pluck the purples, then swarm the whole squad into the Atlas: 10 purples + 14 reds = 114 > 101."""
import math, time
import pk2

POM = 82
pad = pk2.Pad()
pk2.gather(pad)
print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)
for b in [e for e in pk2.enemies() if e["id"] == POM]:
    print("bud", round(b["x"]), round(b["z"]), "travel", pk2.detour(pad, b["x"], b["z"], near=150), flush=True)
    if not pk2.detour(pad, b["x"], b["z"], near=150):
        print(" unreachable", flush=True); print(pk2.shot("bud_stuck"), flush=True); continue
    for i in range(5):
        print(" throw", i, "miss", round(pk2.throw_at(pad, b["x"], b["z"], n=1)), flush=True)
        time.sleep(1.5)
    time.sleep(6)                              # seeds fly out and plant
    print(" plucked", pk2.pluck(pad), "squad", pk2.squad(0), flush=True)
    pk2.gather(pad)
print("purples", pk2.counts(pk2.WATCH["purple"]) if False else "?", "squad", pk2.squad(0), flush=True)
print(pk2.shot("purple"), flush=True)
a = pk2.pellets("item")[0]
print("atlas travel", pk2.detour(pad, a["x"], a["z"], near=200), flush=True)
for i in range(4):
    pk2.swarm(pad, a["x"], a["z"], 5)
    time.sleep(3)
    if pk2.squad(0) == 0:
        break
time.sleep(10)
b = pk2.pellets("item")
print("atlas", b and (round(b[0]["x"]), round(b[0]["z"])), "moved" if not b or math.hypot(b[0]["x"] - a["x"], b[0]["z"] - a["z"]) > 30 else "stuck", flush=True)
print(pk2.shot("atlas_lift"), flush=True)

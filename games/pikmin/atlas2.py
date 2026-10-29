"""Both buds spent: pluck the last purple seed, walk the route to the Spherical Atlas and swarm it until it moves,
then wait for it to reach the pod."""
import math, time
import pk2
from purple import pad, walk

pk2.gather(pad)
print("kinds", pk2.counts(0x80512FEC), "squad", pk2.squad(0), flush=True)
a = pk2.pellets("item")[0]
for i in range(6):
    pk2.swarm(pad, a["x"], a["z"], 5)
    time.sleep(4)
    b = pk2.pellets("item")
    moved = not b or math.hypot(b[0]["x"] - a["x"], b[0]["z"] - a["z"]) > 30
    print("swarm", i, "squad", pk2.squad(0), "atlas", b and (round(b[0]["x"]), round(b[0]["z"])), flush=True)
    if moved or pk2.squad(0) == 0:            # never whistle here: it pulls the carriers off
        break
for t in range(24):                            # carrying to the pod
    b = pk2.pellets("item")
    if not b:
        print("delivered", flush=True); break
    print("carry", t, round(b[0]["x"]), round(b[0]["z"]), flush=True)
    time.sleep(5)
print(pk2.shot("atlas_done"), flush=True)

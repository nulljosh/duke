"""Spherical Atlas weighs 101: reds cap out at 100 carriers, so it needs purples (strength 10). The two Candypop
Buds on this floor (enemy id 82, Pom) turn each Pikmin thrown in into a purple seed, 5 per bud. Walk the cave's
route graph there (Snow Bulborbs, id 45, stand along the loop: kill them on the way), throw 5 reds into each bud,
pluck the purples, walk back and swarm the Atlas: 10 purples + 14 reds = 114 > 101."""
import math, time
import pk2

POM, SNOW = 82, 45
pad = pk2.Pad()


def fight(r=350):
    me = pk2.pos()
    for e in [e for e in pk2.enemies() if e["id"] == SNOW and e["hp"] > 0 and math.hypot(e["x"] - me[0], e["z"] - me[1]) < r]:
        print(" fight", round(e["x"]), round(e["z"]), flush=True)
        for _ in range(8):
            live = [f for f in pk2.enemies() if f["id"] == SNOW and f["hp"] > 0 and math.hypot(f["x"] - e["x"], f["z"] - e["z"]) < 200]
            if not live:
                break
            if pk2.squad(0):
                pk2.throw_at(pad, live[0]["x"], live[0]["z"], n=pk2.squad(0))
            time.sleep(4)
        pk2.gather(pad)


def walk(x, z, near):
    """Waypoint by waypoint along the cave route, fighting at each stop."""
    for wx, wz in pk2.route(pk2.waypoints(), pk2.pos(), (x, z))[:-1]:
        pk2.goto(pad, wx, wz, near=45)
        fight()
    return pk2.goto(pad, x, z, near=near)


pk2.gather(pad)
print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)
for b in [e for e in pk2.enemies() if e["id"] == POM]:
    print("bud", round(b["x"]), round(b["z"]), "walk", walk(b["x"], b["z"], 150), flush=True)
    for i in range(5):
        print(" throw", i, "miss", round(pk2.throw_at(pad, b["x"], b["z"], n=1)), flush=True)
        time.sleep(1.5)
    time.sleep(6)                              # seeds fly out and plant
    print(" plucked", pk2.pluck(pad), "squad", pk2.squad(0), flush=True)
    pk2.gather(pad)
print("purples", pk2.squad(0), "squad; shot", pk2.shot("purple"), flush=True)
a = pk2.pellets("item")[0]
print("atlas walk", walk(a["x"], a["z"], 200), flush=True)
for i in range(4):
    pk2.swarm(pad, a["x"], a["z"], 5)
    time.sleep(3)
    if pk2.squad(0) == 0:
        break
time.sleep(10)
b = pk2.pellets("item")
print("atlas", b and (round(b[0]["x"]), round(b[0]["z"])), "moved" if not b or math.hypot(b[0]["x"] - a["x"], b[0]["z"] - a["z"]) > 30 else "stuck", flush=True)
print(pk2.shot("atlas_lift"), flush=True)

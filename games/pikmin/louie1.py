"""Day 1, Louie: walk the route graph from the ship toward the Courage Reactor, logging each leg."""
import pk2

pk2.ACTIVE = 1
pad = pk2.Pad()
pk2.Walker.yaw = None
for x, z in pk2.route(pk2.waypoints(), pk2.pos(), (-1070, 3290)):
    ok = pk2.goto(pad, x, z, near=45)
    print((round(x), round(z)), ok, tuple(round(v) for v in pk2.pos()), flush=True)
    if not ok:
        break
print(pk2.shot("louie1"))

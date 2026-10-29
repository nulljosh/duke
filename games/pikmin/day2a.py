"""Day 2: walk Olimar's 20 to Emergence Cave (ItemCave tutorial_1 at -190, 1160) along the route graph."""
import pk2

CAVE = (-190, 1160)
pad = pk2.Pad()
pts = pk2.route(pk2.waypoints(), (-225, 2785), CAVE)
for x, z in [(-225, 2785)] + pts:
    ok = pk2.goto(pad, x, z, near=40)
    print(f"wp {x:.0f} {z:.0f} {ok} at {pk2.pos()[0]:.0f} {pk2.pos()[1]:.0f} squad {pk2.squad(0)}", flush=True)
print(pk2.shot("d2cave"), flush=True)

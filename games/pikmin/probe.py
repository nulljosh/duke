"""Scout a route with Olimar alone (purples stay in the ship): clears the morning talk, walks nav() to (X, Z),
prints every waypoint and any threat, then walks back to the ship. A captain survives what kills Pikmin.
  python3 probe.py X Z"""
import sys
import pk2

X, Z = float(sys.argv[1]), float(sys.argv[2])
pad = pk2.Pad()
for i in range(50):
    if pk2.moved(pad, 0, -1, 0.5):
        break
    pad.press("A", after=1.3)
print("free", i, "squad", pk2.squad(0), flush=True)
assert pk2.squad(0) == 0, "probe walks alone"
r = pk2.nav(pad, X, Z, near=150, gap=float(sys.argv[3]) if len(sys.argv) > 3 else 250)
print("probe result", r if not isinstance(r, dict) else ("threat", r), [round(v) for v in pk2.pos()], pk2.shot("probe"), flush=True)
print("back", pk2.nav(pad, 512, 2662, near=60, guard=False), flush=True)

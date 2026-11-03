"""Break a bramble gate: walk the squad to it on the guarded route, then keep throwing everyone at it until it is gone.
Exits 3 on any Pikmin death (steps.py rolls back), 4 if it still stands after 15 minutes.
  python3 breakgate.py X Z [AX AZ]   AX AZ: the open waypoint to stand on (the gate node itself is cut from the graph)"""
import math
import sys
import time
import pk2

GX, GZ = float(sys.argv[1]), float(sys.argv[2])
AX, AZ = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (GX, GZ)
pad = pk2.Pad()
a0 = pk2.alive()
# a broken gate stays in the gate manager (2026-11-03: the bot stood at a fallen gate for 10 minutes); its waypoint
# opening (flag 1 cleared) is the real sign it fell
standing = lambda: any(w[3] & 1 and math.hypot(w[0] - GX, w[1] - GZ) < 40 for w in pk2.waypoints().values())
r = pk2.nav(pad, AX, AZ, near=60)
print("at gate", r if not isinstance(r, dict) else ("threat", r["id"]), [round(v) for v in pk2.pos()], flush=True)
if r is not True:
    sys.exit(3 if isinstance(r, dict) else 2)
t0 = time.time()
while standing() and time.time() - t0 < 900:
    if pk2.alive() < a0:
        print("LOSS", a0 - pk2.alive(), flush=True)
        sys.exit(3)
    n = pk2.squad(0)
    if n:
        pk2.throw_at(pad, GX, GZ, n=n)
    time.sleep(6)
print("gate", "down" if not standing() else "still up", round(time.time() - t0), "s", pk2.shot("gate-break"), flush=True)
time.sleep(3)
pk2.regroup(pad)
sys.exit(0 if not standing() else 4)

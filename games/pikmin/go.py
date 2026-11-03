"""Walk the squad to (X, Z) along the route graph, fighting what blocks the way with a full burst.
Exit 0 there, 2 blocked by something we don't fight, 3 a Pikmin died (steps.py rolls back).
  python3 go.py X Z [near]"""
import subprocess
import sys
import pk2

X, Z = float(sys.argv[1]), float(sys.argv[2])
NEAR = float(sys.argv[3]) if sys.argv[3:] else 60
FIGHT = {1, 2, 3, 4, 5, 13, 15, 26, 27, 84}   # Bulborbs, Burrow-nit, Water Dumple, Wogpole, Creeping Chrysanthemum
pad = pk2.Pad()
for _ in range(8):
    r = pk2.nav(pad, X, Z, near=NEAR)
    if r is True:
        sys.exit(0)
    if not isinstance(r, dict):
        sys.exit(2)
    if r["id"] == -1:
        sys.exit(3)
    if r["id"] not in FIGHT:
        print("blocked by", r["id"], flush=True)
        sys.exit(2)
    pad.lock.close()                           # fight.py takes the pad itself
    rc = subprocess.call([sys.executable, "-u", "fight.py", str(r["id"]), str(r["x"]), str(r["z"]), "--burst"] + (["--stay"] if r["id"] in (15, 84) else []))
    if rc:
        sys.exit(rc)
    pad = pk2.Pad()
sys.exit(2)

"""Kill one enemy with the squad: stand off ~180, throw Pikmin onto it, whistle them back between volleys.
Purples stun and crush small enemies. Stops on any Pikmin death (LOSS) so a reload can undo it.
  python3 fight.py ID X Z      the enemy of type ID nearest (X, Z)"""
import math
import sys
import time
import pk2

EID, X, Z = int(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
BURST = "--burst" in sys.argv
pad = pk2.Pad()
a0 = pk2.alive()               # the caller owns the savestate: a save here once overwrote the good one after a loss


def target():
    """Track it from where it was last seen: a chasing Dwarf left the old 400 radius, read as dead, and ate three."""
    global X, Z
    es = [e for e in pk2.enemies() if e["id"] == EID and e["hp"] > 0 and math.hypot(e["x"] - X, e["z"] - Z) < 600]
    e = min(es, key=lambda e: math.hypot(e["x"] - X, e["z"] - Z)) if es else None
    if e:
        X, Z = e["x"], e["z"]
    return e


pk2.regroup(pad)
for volley in range(12):
    e = target()
    if pk2.alive() < a0:
        print("LOSS", a0 - pk2.alive(), flush=True)
        pad.press("B", 1800, after=0.5)
        sys.exit(3)
    if not e:
        print("dead after", volley, "volleys", flush=True)
        break
    if pk2.alive() < a0:
        print("LOSS", a0 - pk2.alive(), flush=True)
        sys.exit(3)
    n = pk2.squad(0)
    print("volley", volley, "hp", round(e["hp"]), "squad", n, flush=True)
    if n == 0:
        pk2.regroup(pad)
        continue
    pk2.throw_at(pad, e["x"], e["z"], n=n if BURST else min(n, 5))   # BURST: everyone at once, the stun lock
    time.sleep(6 if BURST else 3)
    pad.press("B", 1500, after=1.0)            # call them off before it shakes them loose and bites
time.sleep(2)
pk2.regroup(pad)
print("squad", pk2.squad(0), "alive", pk2.alive(), "lost", a0 - pk2.alive(), pk2.shot("fight"), flush=True)
sys.exit(3 if pk2.alive() < a0 else 4 if target() else 0)   # 4: it survived every volley

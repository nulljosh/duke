"""One cave floor: whistle the squad in, kill what's close, send Pikmin to every treasure, wait for each one to reach
the pod, then walk into the hole and go down. Time doesn't pass in caves, so there's no rush here.
python3 floor.py [down]   with 'down' it also takes the hole at the end."""
import math
import sys
import time

import pk2
import os as _os
TOL = int(_os.environ.get("PK_TOLERATE", "0"))   # losses allowed before a LOSS stop (steps.py)

pk2.ITEM_MGRS.update(hole=0x805167C8)
FIRE = any(e["id"] == 20 and e["hp"] > 0 for e in pk2.enemies())   # fire geysers on this floor: Reds only
SKIP = {0, 88, 91}
pad = pk2.Pad()
pk2.control(pad, 12)                           # clear any box left up (a tutorial pause froze HoB 3 twice)


def regroup():
    if globals().get("FIRE"):                  # reds-only floor: a wide whistle would pull the purples into the fire
        pk2.regroup(pad, r=250)
        print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)
        return
    """Whistle the squad back; when most of it is out of whistle range, walk to where it stands and whistle there
    (2026-11-03: the squad sat by a finished fight while the captains waited alone; caves have no gates to walk into)."""
    for _ in range(4):
        if pk2.squad(0) >= pk2.alive() - 1:
            break
        pk2.gather(pad)
        far = pk2.pikis()
        if pk2.squad(0) < pk2.alive() // 2 and far:
            cx, cz = sum(p[0] for p in far) / len(far), sum(p[1] for p in far) / len(far)
            pk2.travel(pad, cx, cz, near=80)
            pk2.whistle_at(pad, cx, cz, 2500)
    print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)


def fight(r=500):
    """Every live non-harmless enemy within r, one at a time, with fight.py: the whole squad in one burst and kept on
    it (2026-11-03: volleys plus whistle-offs on floor 1 lost a Pikmin to a female Sheargrub that needed no fight)."""
    import subprocess
    global pad
    me = pk2.pos()
    for e in pk2.threats(me[0], me[1], r):
        if e["id"] == 20 and not FIRE:
            continue                           # never send purples at a fire geyser
        print("fight", e["id"], round(e["x"]), round(e["z"]), flush=True)
        pad.lock.close()
        rc = subprocess.call([sys.executable, "-u", "fight.py", str(e["id"]), str(e["x"]), str(e["z"]), "--burst", "--stay"])
        pad = pk2.Pad()
        if rc == 3:
            sys.exit(3)
        regroup()


def walk(x, z, near):
    """Guarded walk: the route graph, stopping at each live threat to kill it first (male Sheargrubs wait buried by
    the paths and bit a walker twice on floor 1, 2026-11-03). Falls back to a straight travel when the graph ends."""
    fought = set()
    for _ in range(8):
        r = pk2.nav(pad, x, z, near=near, guard=len(fought) < 3)
        if r is True:
            return True
        if isinstance(r, dict) and r["id"] == -1:
            sys.exit(3)
        if isinstance(r, dict):                # once fought and still there (buried), walk on unguarded
            key = (r["id"], round(r["x"] / 50), round(r["z"] / 50))
            if key in fought:
                r2 = pk2.nav(pad, x, z, near=near, guard=False)
                if r2 is True or (isinstance(r2, dict) and r2["id"] == -1):
                    return r2 is True or sys.exit(3)
            fought.add(key)
            fight(400)
            continue
        return pk2.travel(pad, x, z, near=near)
    return False


regroup()
if FIRE:
    # Fire geysers: geyser.py kills every one near a path we will walk (to each treasure and to the hole) with
    # Reds only, selected by a test throw; the purples stay 180 back. Parking the purples by throwing them was
    # unreliable (2026-11-03, HoB 3).
    import subprocess
    pk2.ITEM_MGRS.update(hole=0x805167C8)
    wps = pk2.waypoints()
    goals = [(p["x"], p["z"]) for p in pk2.pellets("treasure")] + list(pk2.items("hole")[:1])
    path = [q for g in goals for q in pk2.route(wps, pk2.pos(), g)]
    hot = sorted({(e["x"], e["z"]) for e in pk2.enemies() if e["id"] == 20 and e["hp"] > 0
                  for q in path if math.hypot(q[0] - e["x"], q[1] - e["z"]) < 170},
                 key=lambda g: math.hypot(g[0] - pk2.pos()[0], g[1] - pk2.pos()[1]))
    print("fire floor: geysers on our paths", [(round(x), round(z)) for x, z in hot], flush=True)
    pad.lock.close()
    for gx, gz in hot:
        rc = subprocess.call([sys.executable, "-u", "geyser.py", str(gx), str(gz)])
        if rc == 3:
            sys.exit(3)
    pad = pk2.Pad()
    FIRE = False                               # the paths are clear: whole squad from here


def loot():
    """Treasures plus item pellets: upgrades like the Spherical Atlas come through the item manager."""
    return [dict(p, kind=k) for k in ("treasure", "item") for p in pk2.pellets(k)]


for t in loot():
    print("treasure", t["i"], round(t["x"]), round(t["z"]), flush=True)
    walk(t["x"], t["z"], 150)
    fight()
    for _ in range(20):
        if not any(p["i"] == t["i"] and math.hypot(p["x"] - t["x"], p["z"] - t["z"]) < 50 for p in pk2.pellets(t["kind"])):
            break                              # it moved: they're carrying it
        if pk2.squad(0):
            pk2.throw_at(pad, t["x"], t["z"], n=min(pk2.squad(0), 15))
        time.sleep(3)
t0 = time.time()
while loot() and time.time() - t0 < 180:   # carriers walking to the pod
    time.sleep(5)
print("treasures left", len(loot()), flush=True)
regroup()
def roundup():
    """Every Pikmin into the squad before the hole: the ones left on a floor are lost when the captains go down
    (Joshua, 2026-11-03: "get all the pikmin before we go to the next stage"). Walks to each straggler, whistles."""
    stuck = 0
    for _ in range(8):
        regroup()
        if pk2.squad(0) >= pk2.alive():
            return True
        if stuck >= 2:                         # two fetches gained nobody: that one is wedged, go on without it
            print("roundup: leaving", pk2.alive() - pk2.squad(0), "wedged", flush=True)
            return True
        s0 = pk2.squad(0)
        me = pk2.pos()
        far = sorted((p for p in pk2.pikis() if math.hypot(p[0] - me[0], p[1] - me[1]) > 120),
                     key=lambda p: math.hypot(p[0] - me[0], p[1] - me[1]))
        if not far:
            return True
        print("roundup: fetching", len(far), "at", [round(v) for v in far[0]], flush=True)
        walk(far[0][0], far[0][1], 60)
        pk2.whistle_at(pad, far[0][0], far[0][1], 2500)
        stuck = stuck + 1 if pk2.squad(0) <= s0 else 0
    print("roundup short:", pk2.squad(0), "of", pk2.alive(), flush=True)
    return pk2.squad(0) >= pk2.alive()


if sys.argv[1:] == ["down"]:
    FIRE = False                               # everyone back now, purples included
    if not roundup():
        sys.exit(4)                            # never leave Pikmin behind: steps.py retries the floor
    hole = pk2.items("hole")[0]
    print("hole", walk(*hole, 80), flush=True)
    w = pk2.Walker(pad)
    for _ in range(6):                         # the hole sits on a mound; goto stalls on its rim, so push on
        w.toward(*hole, 0.4)
    pad.press("A", after=2)                    # "Delve deeper?" opens on Yes
    pad.press("A", after=15)
    print(pk2.shot("hole"), flush=True)

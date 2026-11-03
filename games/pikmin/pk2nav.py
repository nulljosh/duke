"""Safe movement and undo for the Pikmin 2 bot: threat checks, regroup, guarded route walking, Dolphin savestates.
Split out of pk2.py for size; pk2 re-exports everything here."""
import pk2
from pk2 import travel, whistle_at, alive, detour, enemies, goto, pikis, pos, route, squad, waypoints  # noqa: F401


HARMLESS = {0, 12, 16, 37, 46, 47, 48, 49, 50, 80, 87, 90, 91}   # EnemyTypeID (decomp enemyInfo.h): Pellet Posy, female
# Sheargrub, Honeywisp, Egg and the plants. Not harmless: 21 gas pipe (poison), 84 Creeping Chrysanthemum.


def threats(x, z, r=260):
    """Live enemies other than HARMLESS within r of (x, z), nearest first."""
    import math
    out = [e for e in enemies() if e["id"] not in HARMLESS and e["hp"] > 0 and math.hypot(e["x"] - x, e["z"] - z) < r]
    return sorted(out, key=lambda e: math.hypot(e["x"] - x, e["z"] - z))


def regroup(pad, tries=3, r=350):
    """Whistle in the Pikmin standing within r of the captain. Never walks: gather() walked the squad toward the five
    Blues penned behind the electric gate at (450, 1905) and the purples died in it (2026-11-02, third wipe)."""
    import math
    for _ in range(tries):
        me = pos()
        loose = [p for p in pikis() if math.hypot(p[0] - me[0], p[1] - me[1]) < r]
        if squad(pk2.ACTIVE) >= len(loose) - 1:
            return True
        pad.press("B", 1800, after=1.5)
    return False


def nav(pad, x, z, near=60, guard=True, gap=250):
    """Walk the area's carry-route graph to (x, z): the Pikmin's own paths, so always walkable. The route starts at
    whichever of its points is nearest now (A* can start behind the captain). Between points it regroups so the squad
    never strings out, and with guard it refuses any point with an enemy near it (2026-11-02: ten purples walked
    behind Olimar into a Bulborb at (-527, 3175) and all died). Returns True, False (stuck) or the threat dict.
    ponytail: avoid-only; fighting is the caller's call once it sees the threat."""
    import math
    pts = route(waypoints(), pos(), (x, z))
    me = pos()
    a0 = alive()
    if len(pts) > 1 and math.hypot(pts[-2][0] - x, pts[-2][1] - z) > gap:
        print("unreachable: route ends", round(math.hypot(pts[-2][0] - x, pts[-2][1] - z)), "short", flush=True)
        return False
    k = min(range(len(pts)), key=lambda i: math.hypot(pts[i][0] - me[0], pts[i][1] - me[1]))
    for px, pz in pts[k:]:
        print("wp", round(px), round(pz), "squad", squad(pk2.ACTIVE), "alive", alive(), flush=True)
        if alive() < a0:                       # any death: stop dead, whistle, let the caller back off
            print("LOSS", a0 - alive(), "at", [round(v) for v in pos()], flush=True)
            pad.press("B", 1800, after=0.5)
            return {"id": -1, "x": pos()[0], "z": pos()[1], "hp": 0}
        if guard:
            t = threats(px, pz)
            if t:
                print("threat", t[0]["id"], round(t[0]["x"]), round(t[0]["z"]), "hp", round(t[0]["hp"]), flush=True)
                regroup(pad)
                return t[0]
        if not goto(pad, px, pz, near=50):
            detour(pad, px, pz, near=60, tries=4)
        if squad(pk2.ACTIVE) < alive() - 2:
            regroup(pad)
    return goto(pad, x, z, near=near) or detour(pad, x, z, near=near, tries=4)


def savestate(pad):
    """Dolphin savestate slot 1 (L3 on the DSU pad, Hotkeys.ini). Take one before anything risky."""
    pad.press("L3", 150, after=1.5)


def loadstate(pad):
    """Undo back to the last savestate (R3): the cheap reload after a loss, no Dolphin restart."""
    pad.press("R3", 150, after=3)


def gather(pad):
    """Unsafe: it walks, and once walked the purples into an electric gate. Prefer regroup(). Walk to the Pikmin that are not in the squad and whistle them in."""
    import math
    for _ in range(4):
        if squad(pk2.ACTIVE) >= alive():
            return True
        me = pos()
        far = max(pikis(), key=lambda p: math.hypot(p[0] - me[0], p[1] - me[1]))
        if math.hypot(far[0] - me[0], far[1] - me[1]) > 120:
            travel(pad, *far, near=80)
        whistle_at(pad, *far, ms=1500)        # plain B whistles at the cursor, which can sit far from the strays
    return squad(pk2.ACTIVE) >= alive()

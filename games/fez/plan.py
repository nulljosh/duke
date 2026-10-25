#!/usr/bin/env python3
"""plan.py: find a path for Gomez inside one FEZ level, in one camera view, from the level data.
The level is flattened to a 2D grid the way the camera sees it (collision is per view: Faces[view]).
Moves: walk, step off a ledge (fall at most MAX_DROP), hop (up to JUMP_UP, across up to JUMP_ACROSS), climb, turn.
  plan.py LEVEL VIEW FROM_H FROM_Y FROM_DEPTH TO_H TO_Y [TO_VIEW]      prints the move list
Grid columns are screen-horizontal units (fez.h), rows are the y of the floor Gomez stands on."""
import collections, heapq, sys
import fezmap

MAX_DROP = 5        # 6.1 from standing survived once, but 6 with walking momentum killed (Zu City Ruins); keep 5
JUMP_UP = 2         # full jump peak is about +2.3
JUMP_ACROSS = 5     # a standing full jump cleared 5 (Clock, 2026-10-25); ledge grabs add reach
SOLID = ("TopOnly", "TopNoStraightLedge", "AllSides")


DEPTHS = {}   # (level, view) -> {(col, y): sorted depth coordinates of the solid triles in that cell}
CLIMB = {}    # (level, view) -> {(col, y)} cells with a vine or ladder facing this camera
# A vine's Face is rotated by Phi quarter turns; measured in the Observatory 2026-10-25 (phi 1 sits on -x sides).
FACING = {0: "Front", 1: "Left", 2: "Back", 3: "Right"}


ROTATED = {}   # level -> {group id: quarter turns} applied by a switch the executor just pulled (180 degrees only)


def triles(name):
    """The level's triles, with any switched RotatingGroup turned about its SpinCenter (vertical axis)."""
    d = fezmap.level(name); rot = ROTATED.get(name, {})
    if not rot: return d["Triles"]
    moved = {}
    for gid, q in rot.items():
        g = d["Groups"][str(gid)]; cx, _, cz = g["SpinCenter"]
        for p in g["Triles"]:
            moved[tuple(p)] = (q, cx, cz)
    out = []
    for t in d["Triles"]:
        m = moved.get(tuple(t["Emplacement"]))
        if m and m[0] % 4 == 2:
            x, y, z = t["Position"]; q, cx, cz = m
            t = dict(t, Position=[2 * cx - x - 1, y, 2 * cz - z - 1], Phi=(t["Phi"] + q) % 4)
        out.append(t)
    return out


def grid(name, view):
    """(col, y) -> 'top' | 'wall' | 'climb', using the same projection as fezmap.view."""
    d = fezmap.level(name); ts = fezmap.tileset(d["TrileSetName"]); hi, hs, di, ds = fezmap.VIEWS[view]
    key = (name, view, tuple(sorted(ROTATED.get(name, {}).items())))
    DEPTHS[(name, view)] = {}; CLIMB[(name, view)] = set()
    g = {}; deps = DEPTHS[(name, view)]; cl = CLIMB[(name, view)]
    for t in triles(name):
        e = ts.get(t["Id"])
        if not e or e.get("Immaterial"): continue
        # a trile at P spans [P, P+1]; take its centre so mirrored views (sign -1) land in the right column
        cell = (int((t["Position"][hi] + 0.5) * hs // 1), round(t["Position"][1]))   # some triles sit off-grid (y 13.9375)
        if e["Type"] in ("Vine", "Ladder"):
            if FACING.get(t["Phi"] % 4) == view or e["Type"] == "Ladder": cl.add(cell)
            continue
        f = e["Faces"].get(view, "None")
        if f == "AllSides": g[cell] = "wall"
        elif f in SOLID and g.get(cell) != "wall": g[cell] = "top"
        if f in SOLID: deps.setdefault(cell, set()).add(int(t["Position"][di] // 1))
    return g


def standable(g, c, y):
    """Gomez can stand at column c with feet at y: something solid under him, no wall where his body is."""
    return g.get((c, y - 1)) in ("top", "wall") and g.get((c, y)) != "wall" and g.get((c, y + 1)) != "wall"


def land(g, c, y, lo):
    """Where a fall in column c starting at feet height y lands (feet y), or None if it falls past lo."""
    for yy in range(y, lo, -1):
        if g.get((c, yy)) == "wall": return None
        if standable(g, c, yy): return yy
    return None


def moves(g, c, y, lo, cl=frozenset()):
    on_vine = (c, y) in cl or (c, y + 1) in cl
    stand = standable(g, c, y)
    if stand:
        for dc in (-1, 1):
            if standable(g, c + dc, y): yield ("walk", c + dc, y), 1
            elif g.get((c + dc, y)) != "wall" and g.get((c + dc, y + 1)) != "wall":
                for k in range(1, 4):   # step off and drift: Gomez covers about 3 columns in a 5-unit fall
                    cc = c + dc * k
                    if not any(g.get((cc, yy)) == "wall" for yy in range(y - 1, y + 2)):
                        ly = land(g, cc, y, lo)
                        if ly is not None and y - ly <= MAX_DROP and (k == 1 or y - ly >= k): yield ("drop", cc, ly), 2 + k
            for across in range(1, JUMP_ACROSS + 1):
                cc = c + dc * across
                if any(g.get((c + dc * k, y + 2)) == "wall" for k in range(1, across + 1)): break
                for up in range(JUMP_UP + (1 if across <= 3 else 0), -5, -1):   # +3 only by catching the ledge
                    if standable(g, cc, y + up) and not (across == 1 and up == 0):
                        yield ("hop", cc, y + up), 3 + across
                        break
        for dc in (-2, -1, 0, 1, 2):   # jump onto a vine within reach and hold on
            for dy in (1, 2):
                if (c + dc, y + dy) in cl and not standable(g, c + dc, y + dy): yield ("grab", c + dc, y + dy), 4
    if on_vine and not stand or (c, y) in cl:
        for dc, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            cc, yy = c + dc, y + dy
            if g.get((cc, yy)) == "wall" or g.get((cc, yy + 1)) == "wall": continue
            if (cc, yy) in cl or (cc, yy + 1) in cl: yield ("climb", cc, yy), 2
            elif standable(g, cc, yy): yield ("climb", cc, yy), 2   # step off the vine onto a floor (top-out or sideways)
        if not stand:
            ly = land(g, c, y - 1, lo)
            if ly is not None and y - ly <= MAX_DROP: yield ("release", c, ly), 3


ORDER = ["Front", "Right", "Back", "Left"]   # one press of D steps Right -> Back -> Left -> Front


def settle_depth(name, view, c, y, dep):
    """Depth after landing at (c, y): stay put if there is a trile at Gomez's depth, else snap to the front-most one."""
    D = DEPTHS[(name, view)].get((c, y - 1), ())
    if dep in D or not D: return dep
    ds = fezmap.VIEWS[view][3]
    return max(D, key=lambda d: d * ds)


def find_item(name, view, start, item):
    """Cheapest reachable spot from which Gomez can touch `item` (3D): standing within a column and at most 2 below it."""
    def near(node):
        v, c, y, dep = node; hi, hs, di, _ = fezmap.VIEWS[v]
        return abs((item[hi] + 0.5) * hs - (c + 0.5)) <= 0.9 and 0 <= item[1] + 0.5 - y <= 2.6
    return find(name, view, start, None, None, near)


def find(name, view, start, goal, goal_view=None, done=None):
    """Nodes are (view, col, y, depth). Turning the camera keeps Gomez's 3D position and re-projects it;
    his depth only changes when he lands on a trile at another depth."""
    grids = {v: grid(name, v) for v in ORDER}
    lo = min(y for g in grids.values() for _, y in g) - 1
    s0 = (view, *start)
    dist, prev, q = {s0: 0}, {}, [(0, s0)]
    end = None
    while q:
        d0, cur = heapq.heappop(q)
        v, c, y, dep = cur
        if (done(cur) if done else (c, y) == goal and goal_view in (None, v)): end = cur; break
        if d0 > dist[cur]: continue
        nxt = [((v, c2, y2, settle_depth(name, v, c2, y2, dep)), kind, cost) for (kind, c2, y2), cost in moves(grids[v], c, y, lo, CLIMB[(name, v)])]
        hi, hs, di, _ = fezmap.VIEWS[v]
        pos = [0.0, 0.0, 0.0]; pos[hi] = (c + 0.5) * hs; pos[di] = dep + 0.5
        for step in (1, -1):
            nv = ORDER[(ORDER.index(v) + step) % 4]; nhi, nhs, ndi, _ = fezmap.VIEWS[nv]
            nc, nd_ = int(pos[nhi] * nhs // 1), int(pos[ndi] // 1)
            if standable(grids[nv], nc, y) and standable(grids[v], c, y): nxt.append(((nv, nc, y, nd_), "turn-" + nv, 3))
        for node, kind, cost in nxt:
            nd = d0 + cost
            if nd < dist.get(node, 1e9): dist[node] = nd; prev[node] = (cur, kind); heapq.heappush(q, (nd, node))
    if end is None: return None
    path, cur = [], end
    while cur != s0: p, kind = prev[cur]; path.append((kind, cur)); cur = p
    return path[::-1]


def compress(path):
    """Merge runs of walking into one walk to the run's end."""
    out = []
    for kind, cell in path:
        if kind == "walk" and out and out[-1][0] == "walk": out[-1] = ("walk", cell)
        else: out.append((kind, cell))
    return out


if __name__ == "__main__":
    lvl, view, fh, fy, fd, th, ty = sys.argv[1:8]
    gv = sys.argv[8] if len(sys.argv) > 8 else None
    p = find(lvl, view, (int(float(fh) // 1), int(float(fy)), int(float(fd) // 1)), (int(float(th) // 1), int(float(ty))), gv)
    print("no path" if p is None else "\n".join(f"{k:11} {v:5} col {c:4} y {y} depth {d}" for k, (v, c, y, d) in compress(p)))

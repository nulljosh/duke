#!/usr/bin/env python3
"""plan.py: find a path for Gomez inside one FEZ level, in one camera view, from the level data.
The level is flattened to a 2D grid the way the camera sees it (collision is per view: Faces[view]).
Moves: walk, step off a ledge (fall at most MAX_DROP), hop (up to JUMP_UP, across up to JUMP_ACROSS), climb, turn.
  plan.py LEVEL VIEW FROM_H FROM_Y FROM_DEPTH TO_H TO_Y [TO_VIEW]      prints the move list
Grid columns are screen-horizontal units (fez.h), rows are the y of the floor Gomez stands on."""
import ast, collections, heapq, math, pathlib, sys
import fezmap

MAX_DROP = 6        # stepping off from rest turns into deadly FreeFalling after ~7 (Zu Library trace); jumps first eat into it
JUMP_UP = 2         # full jump peak is about +2.3
JUMP_ACROSS = 5     # a standing full jump cleared 5 (Clock, 2026-10-25); ledge grabs add reach


def iround(v):
    """Round half up (Python's round() sends 34.5 to 34, which put doors one row off)."""
    return int(math.floor(v + 0.5))


SOLID = ("TopOnly", "TopNoStraightLedge", "AllSides")


DEPTHS = {}   # (level, view) -> {(col, y): depth of the front-most solid trile in that cell}
ALLDEPTHS = {}   # (level, view) -> {(col, y): depths of every solid trile in that cell (Gomez keeps his depth if one is there)}
CLIMB = {}    # (level, view) -> {(col, y): {depths}} cells with a vine or ladder Gomez can climb from this camera
FLAT = {}     # (level, view) -> {(col, y): {depths}} the subset facing toward or away from the camera: these allow shimmying sideways
# A vine's Face is rotated by Phi quarter turns; measured in the Observatory 2026-10-25 (phi 1 sits on -x sides).
FACING = {0: "Front", 1: "Left", 2: "Back", 3: "Right"}
OPPOSITE = {"Front": "Back", "Back": "Front", "Left": "Right", "Right": "Left"}


ROTATED = {}   # level -> {group id: quarter turns} applied by a switch the executor just pulled (180 degrees only)
HOLES = {}     # level -> [(from, to)] black holes the bridge reports as on; their cells (plus a margin) count as walls


class Grid(dict):
    water = None   # node row of the water surface, if the level has water
    cols = (0, 0)  # leftmost and rightmost column with a trile: the water ends there


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


def bobbers(name):
    """Groups that move straight up on a looping path (Zu City's floating pillars): {gid: (top triles, rise)}."""
    out = {}
    for gid, g in fezmap.level(name)["Groups"].items():
        path = g.get("Path")
        if not isinstance(path, dict) or path.get("NeedsTrigger"): continue
        segs = [sg["Destination"] for sg in path["Segments"]]
        if any(dx or dz for dx, _, dz in segs) or not g["Triles"]: continue
        rise = iround(sum(dy for _, dy, _ in segs if dy > 0))
        if rise <= 0: continue
        d = fezmap.level(name); ts = fezmap.tileset(d["TrileSetName"])
        solid = {tuple(t["Position"]) for t in d["Triles"] if (e := ts.get(t["Id"])) and any(f in SOLID for f in e["Faces"].values())}
        cols = {}
        for x, y, z in (p for p in g["Triles"] if tuple(p) in solid):   # the pillar's top solid trile, not a decoration on it
            if (x, z) not in cols or y > cols[(x, z)]: cols[(x, z)] = y
        out[int(gid)] = ([(x, y, z) for (x, z), y in cols.items()], rise)
    return out


def grid(name, view):
    """(col, y) -> 'top' | 'wall' | 'climb', using the same projection as fezmap.view."""
    d = fezmap.level(name); ts = fezmap.tileset(d["TrileSetName"]); hi, hs, di, ds = fezmap.VIEWS[view]
    key = (name, view, tuple(sorted(ROTATED.get(name, {}).items())))
    DEPTHS[(name, view)] = {}; CLIMB[(name, view)] = {}; FLAT[(name, view)] = {}; alld = ALLDEPTHS[(name, view)] = {}
    g = Grid(); deps = DEPTHS[(name, view)]; cl = CLIMB[(name, view)]
    front = {}   # cell -> (closeness to camera, trile, entry): FEZ collides with the front-most block the camera sees
    vines = {}
    for t in triles(name):
        e = ts.get(t["Id"])
        if not e or e.get("Immaterial"): continue
        # a trile at P spans [P, P+1]; take its centre so mirrored views (sign -1) land in the right column
        cell = (int((t["Position"][hi] + 0.5) * hs // 1), iround(t["Position"][1]))   # some triles sit off-grid (y 13.9375)
        k = t["Position"][di] * ds
        if e["Faces"].get(view, "None") in SOLID: alld.setdefault(cell, set()).add(int(t["Position"][di] // 1))
        if e["Type"] in ("Vine", "Ladder"):   # vines don't hide what's behind them; keep the nearest one separately
            if cell not in vines or k > vines[cell][0]: vines[cell] = (k, t, e)
        elif cell not in front or k > front[cell][0]: front[cell] = (k, t, e)
    # Measured in the Tree 2026-10-25: a TopOnly shelf hidden behind scenery (trunk, None faces) does not hold Gomez.
    for cell, (k, t, e) in vines.items():
        # Only a vine with no block in front of it can be climbed (one behind the trunk can't, measured in the Tree).
        # From that angle Gomez climbs it facing, edge-on (side-climb) or from behind (back-climb).
        if cell in front and front[cell][0] > k: continue
        cl.setdefault(cell, set()).add(int(t["Position"][di] // 1))
        if FACING[t["Phi"] % 4] in (view, OPPOSITE[view]) or e["Type"] == "Ladder":
            FLAT[(name, view)].setdefault(cell, set()).add(int(t["Position"][di] // 1))
    for lo3, hi3 in HOLES.get(name, []):   # a black hole pulls Gomez in from about a cell away
        for c in range(int(min(lo3[hi] * hs, hi3[hi] * hs) // 1) - 1, int(max(lo3[hi] * hs, hi3[hi] * hs) // 1) + 2):
            for yy in range(int(lo3[1] // 1) - 1, int(hi3[1] // 1) + 2):
                g[(c, yy)] = "wall"
    for cell, (k, t, e) in front.items():
        if g.get(cell) == "wall": continue
        f = e["Faces"].get(view, "None")
        if e["Type"] == "Bouncer" and f in SOLID: g[cell] = "bounce"; deps.setdefault(cell, set()).add(int(t["Position"][di] // 1)); continue
        if f == "AllSides": g[cell] = "wall"
        elif f in SOLID: g[cell] = "top"
        if f in SOLID: deps.setdefault(cell, set()).add(int(t["Position"][di] // 1))
    filled = {tuple(t["Position"]) for t in triles(name) if (e := ts.get(t["Id"])) and not e.get("Immaterial") and e["Type"] not in ("Vine", "Ladder") and any(f in SOLID for f in e["Faces"].values())}
    for cell in [k for k, v in g.items() if v == "top"]:
        x, y, z = front[cell][1]["Position"]
        if (x, y + 1, z) in filled: del g[cell]   # a top covered at the same depth is no floor: Mine A's stacked walls (2026-10-25)
    for gid, (cells, rise) in bobbers(name).items():   # a platform that bobs on a path also holds at the top of its swing
        for x, y, z in cells:
            cell = (int((((x, y, z)[hi]) + 0.5) * hs // 1), y + rise)
            if g.get(cell) is None: g[cell] = "top"; deps.setdefault(cell, set()).add(int((x, y, z)[di] // 1))
    d = fezmap.level(name)
    if d.get("WaterType") not in (None, "None") and d.get("WaterHeight"):
        g.water = iround(d["WaterHeight"] - 0.5 - 0.4)   # the node row Gomez floats at (measured: y 8.5 under water at 9)
    if g: g.cols = (min(c for c, _ in g), max(c for c, _ in g))
    return g


def swimming(g, c, y):
    # unbounded, the surface went on forever and the search ate all memory (Nature Hub, 2026-10-25)
    return g.water == y and g.cols[0] - 4 <= c <= g.cols[1] + 4 and g.get((c, y)) != "wall"


def standable(g, c, y):
    """Gomez can stand at column c with feet at y: something solid under him, no wall where his body is."""
    return g.get((c, y - 1)) in ("top", "wall") and g.get((c, y)) != "wall" and g.get((c, y + 1)) != "wall"


BOUNCE = 7          # a bouncer mushroom throws Gomez about 7 up (Tree trace, 2026-10-25)
BOUNCE_FALL = 15    # after a bounce, FreeFalling only began 18 below the apex (Tree trace); 11 down onto a mushroom was fine


def bouncy(g, c, y):
    return g.get((c, y - 1)) == "bounce"


def land(g, c, y, lo):
    """Where a fall in column c starting at feet height y lands (feet y), or None if it falls past lo.
    Landing on a bouncer counts (it never kills); callers check bouncy() to skip the fall-height limit."""
    for yy in range(y, lo, -1):
        if g.get((c, yy)) == "wall": return None
        if standable(g, c, yy) or bouncy(g, c, yy) or swimming(g, c, yy): return yy
    return None


def safe(g, c, y, ly, limit):
    if ly is not None and swimming(g, c, ly): return True   # water breaks any fall
    # Landing on a bouncer while FreeFalling kills like any floor (Tree, 2026-10-25), so the same limit applies.
    return ly is not None and (y - ly <= limit or (bouncy(g, c, ly) and y - ly <= limit))


def vine_dep(cl, cell, dep):
    """Depth of the climbable vine in `cell` (the front-most one), or None. Climbing is 2D: depth may jump."""
    D = cl.get(cell, ())
    if dep in D: return dep
    return min(D, key=lambda d: abs(d - dep)) if D else None


FLATNOW = {}   # set by find() to FLAT for the view being expanded


def moves(g, c, y, lo, cl=None, dep=0):
    """Yields ((kind, col, y, depth or None), cost). Depth None means 'settle on whatever is landed on'."""
    cl = cl or {}
    if swimming(g, c, y):   # in the water: swim along the surface, or jump out onto a ledge
        for dc in (-1, 1):
            if swimming(g, c + dc, y): yield ("swim", c + dc, y, None), 1
        for dc in range(-3, 4):
            for up in (3, 2, 1):   # a jump out of water peaks about 2.9 up; a 3-high ledge only by catching its edge
                if up == 3 and abs(dc) > 2: continue
                if standable(g, c + dc, y + up): yield ("hop", c + dc, y + up, None), 3 + abs(dc) + (up == 3); break
        return
    if bouncy(g, c, y):   # bouncing on a mushroom: steer up to 4 columns while coming down from the apex
        for dc in range(-5, 6):
            if dc == 0: continue
            ly = land(g, c + dc, y + BOUNCE, lo)
            if ly is not None and y + BOUNCE - ly <= (BOUNCE_FALL if bouncy(g, c + dc, ly) else MAX_DROP + 2): yield ("bounce", c + dc, ly, None), 3 + abs(dc)
        return
    on = vine_dep(cl, (c, y), dep) is not None or vine_dep(cl, (c, y + 1), dep) is not None
    stand = standable(g, c, y)
    if stand:
        for dc in (-1, 1):
            if standable(g, c + dc, y): yield ("walk", c + dc, y, None), 1
            elif g.get((c + dc, y)) != "wall" and g.get((c + dc, y + 1)) != "wall":
                for k in range(1, 4):   # step off and drift: Gomez covers about 3 columns in a 5-unit fall
                    cc = c + dc * k
                    if not any(g.get((cc, yy)) == "wall" for yy in range(y - 1, y + 2)):
                        ly = land(g, cc, y, lo)
                        if safe(g, cc, y, ly, MAX_DROP) and (k == 1 or y - ly >= k): yield ("drop", cc, ly, None), 2 + k
                for j in range(1, 4):   # step off, then steer back in under the ledge just left
                    cc = c + dc - dc * j
                    ly = land(g, cc, y - 2, lo)
                    if ly is not None and 2 + j <= y - ly and safe(g, cc, y, ly, MAX_DROP):
                        yield ("dropback-" + ("right" if dc > 0 else "left"), cc, ly, None), 3 + j
            for across in range(1, JUMP_ACROSS + 1):
                cc = c + dc * across
                if any(g.get((c + dc * k, y + 2)) == "wall" for k in range(1, across + 1)): break
                for up in range(JUMP_UP + (1 if across <= 3 else 0), -5, -1):   # +3 only by catching the ledge
                    # landing lower must be the first floor met falling down that column (floors only pass from below)
                    if across > 5 - max(up, 0): continue   # measured: +2 up and 5 across falls short (Mine A, 2026-10-25)
                    if up == 3 and g.get((cc, y + 1)) is not None: continue   # +3 needs a bare ledge face to catch, not a stack of shelves
                    if standable(g, cc, y + up) and not (across == 1 and up == 0) and (up >= 0 or land(g, cc, y + 2, lo) == y + up):
                        yield ("hop", cc, y + up, None), 3 + across
                        break
        for dc in (-1, 1):   # step off the edge and catch a vine on the way down
            if g.get((c + dc, y - 1)) not in ("top", "wall") and g.get((c + dc, y)) != "wall":
                for k in (-2, -1, 0, 1, 2):
                    for dy in range(1, 6):
                        cell = (c + dc + k, y - dy)
                        if cell in cl and land(g, c + dc + k, y, lo) is None or (cell in cl and (land(g, c + dc + k, y, lo) or -999) < y - dy):
                            for d in cl[cell]: yield ("dropgrab", cell[0], cell[1], d), 4
        for dc in (-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5):   # jump onto a vine within reach (up to 3 above, 4 below) and hold on
            for dy in (3, 2, 1, 0, -1, -2, -3, -4):
                if abs(dc) > 3 and dy > 1: continue
                if dy < 0 and any(g.get((c + dc, yy)) in ("top", "wall", "bounce") for yy in range(y + dy, y)): continue   # floors only pass from below
                cell = (c + dc, y + dy)
                if cell in cl and not standable(g, *cell):
                    for d in cl[cell]: yield ("grab", cell[0], cell[1], d), 4
    if on:
        for dc, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            cc, yy = c + dc, y + dy
            if g.get((cc, yy)) == "wall" or g.get((cc, yy + 1)) == "wall": continue
            # sideways only from a vine that faces the camera (side-climbs go up and down); onto any climbable cell
            nd = vine_dep(cl, (cc, yy), dep) if dy or vine_dep(FLATNOW, (c, y), dep) is not None else None
            if nd is None and dy == 1: nd = vine_dep(cl, (cc, yy + 1), dep)
            if nd is not None: yield ("climb", cc, yy, nd), 2
            elif standable(g, cc, yy): yield ("climb", cc, yy, None), 2   # step off the vine onto a floor
        if not stand:
            ly = land(g, c, y - 1, lo)
            if safe(g, c, y, ly, MAX_DROP - 1): yield ("release", c, ly, None), 3   # letting go starts with a small hop
            for dc in (-2, -1, 0, 1, 2):   # jump off the vine up onto a ledge (catching it if needed)
                for up in (2, 1):   # measured: a jump off a vine gains about 2 (Zu City Ruins, 2026-10-25)
                    if standable(g, c + dc, y + up): yield ("vinejump", c + dc, y + up, None), 4; break


ORDER = ["Front", "Right", "Back", "Left"]   # one press of D steps Right -> Back -> Left -> Front


def settle_depth(name, view, c, y, dep):
    """Depth after landing at (c, y): stay put if there is a trile at Gomez's depth, else snap to the front-most one."""
    if dep in ALLDEPTHS[(name, view)].get((c, y - 1), ()): return dep   # a floor under Gomez at his own depth: he stays there (house interiors)
    D = DEPTHS[(name, view)].get((c, y - 1), ())
    if not D: return dep
    ds = fezmap.VIEWS[view][3]
    return max(D, key=lambda d: d * ds)


def find_item(name, view, start, item):
    """Cheapest reachable spot from which Gomez can touch `item` (3D): standing within a column and at most 2 below it."""
    def near(node):
        v, c, y, dep = node; hi, hs, di, _ = fezmap.VIEWS[v]
        return abs((item[hi] + 0.5) * hs - (c + 0.5)) <= 0.9 and 0 <= item[1] + 0.5 - y <= 2.6
    return find(name, view, start, None, None, near)


BANS = pathlib.Path(__file__).with_name("bans.txt")   # one repr per line, so a failed move stays banned across runs
BANNED = {ast.literal_eval(l) for l in BANS.read_text().splitlines()} if BANS.exists() else set()   # (level, from node, kind, to (view, col, y))


def ban(key):
    BANNED.add(key)
    with BANS.open("a") as f: f.write(repr(key) + "\n")


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
        global FLATNOW; FLATNOW = FLAT[(name, v)]
        nxt = [((v, c2, y2, d2 if d2 is not None else settle_depth(name, v, c2, y2, dep)), kind, cost)
               for (kind, c2, y2, d2), cost in moves(grids[v], c, y, lo, CLIMB[(name, v)], dep)]
        hi, hs, di, _ = fezmap.VIEWS[v]
        pos = [0.0, 0.0, 0.0]; pos[hi] = (c + 0.5) * hs; pos[di] = dep + 0.5
        for step in (1, -1):
            nv = ORDER[(ORDER.index(v) + step) % 4]; nhi, nhs, ndi, _ = fezmap.VIEWS[nv]
            nc, nd_ = int(pos[nhi] * nhs // 1), int(pos[ndi] // 1)
            if standable(grids[nv], nc, y) and standable(grids[v], c, y): nxt.append(((nv, nc, y, nd_), "turn-" + nv, 3))
            elif swimming(grids[v], c, y) and swimming(grids[nv], nc, y): nxt.append(((nv, nc, y, nd_), "turn-" + nv, 3))   # the camera turns while treading water
            elif bouncy(grids[v], c, y) and bouncy(grids[nv], nc, y): nxt.append(((nv, nc, y, nd_), "turn-" + nv, 3))   # turning mid-bounce
            elif vine_dep(CLIMB[(name, v)], (c, y), dep) is not None:   # turning while hanging on a vine
                vd = vine_dep(CLIMB[(name, nv)], (nc, y), nd_)
                if vd is not None: nxt.append(((nv, nc, y, vd), "turn-" + nv, 3))
        for node, kind, cost in nxt:
            if (name, cur, kind, node[:3]) in BANNED: continue
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

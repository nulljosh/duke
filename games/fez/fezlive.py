"""fezlive.py: what the running game says, for plan.py: SurfBridge's collision grid, and platforms that bob on a path."""
import json, math, pathlib
import fezmap

SOLID = ("TopOnly", "TopNoStraightLedge", "AllSides")


def iround(v): return int(math.floor(v + 0.5))


GRIDFILE = pathlib.Path.home() / "Library/Application Support/FEZ/surfgrid.json"
_grid_cache = [None, None]
USE_LIVE = True   # go() turns this off for one retry when the live grid finds no path


def bridge_grid(name, view):
    """Cells [w, y, face, depth, type] the game itself collides with in this view, if SurfBridge dumped this level."""
    try:
        m = GRIDFILE.stat().st_mtime
        if _grid_cache[0] != m: _grid_cache[:] = [m, json.loads(GRIDFILE.read_text())]
    except (OSError, ValueError): return None
    d = _grid_cache[1]
    return d["views"].get(view) if d and d.get("level") == name else None


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

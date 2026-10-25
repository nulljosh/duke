#!/usr/bin/env python3
"""fezmap.py: read FEZ level data (FEZRepacker JSON) for navigation.
  fezmap.py doors LEVEL           every volume that changes level: where it is and where it goes
  fezmap.py route FROM TO         shortest room path over the map tree
  fezmap.py view LEVEL VIEW [x y z]  ASCII side view (Front/Right/Back/Left), @ marks a position.
    # wall, = platform top, H ladder/vine, C cube, b bit, A anti-cube, D door, O black hole, ^ hurts"""
import collections, json, re, struct, sys
from pathlib import Path

DATA = Path("/private/tmp/claude-501/fezlevels")   # ponytail: local copy of /Volumes/LaCie/fezdata/levels, the LaCie is a slow spinning disk


def level(name):
    return json.load(open(DATA / f"{name.lower()}.fezlvl.json"))


def doors(name):
    d = level(name); out = []
    for s in d["Scripts"].values():
        for a in s["Actions"]:
            m = re.match(r"Level\.(ChangeLevel\w*|ChangeToFarAwayLevel)\((\w+)", a)
            v = next((re.match(r"Volume\[(\d+)\]\.Enter", t) for t in s["Triggers"] if t.startswith("Volume[")), None)
            if m and v and v.group(1) in d["Volumes"]:
                vol = d["Volumes"][v.group(1)]
                out.append((m.group(2), vol["From"], vol["To"], vol["Orientations"]))
    return out


def tileset(name):
    b = open(DATA / "tilesets" / f"{name.lower()}.fezts.glb", "rb").read()
    j = json.loads(b[20:20 + struct.unpack_from("<I", b, 12)[0]])
    return {n["extras"]["TrileId"]: n["extras"] for n in j["nodes"] if "extras" in n}


# Screen axes per view: (horizontal axis index, sign, depth axis index, depth sign toward camera).
# Right view: walking right lowers z (measured in game 2026-10-25).
VIEWS = {"Front": (0, 1, 2, 1), "Right": (2, -1, 0, 1), "Back": (0, -1, 2, -1), "Left": (2, 1, 0, -1)}
MARK = {"CubeShard": "C", "GoldenCube": "b", "SecretCube": "A", "Ladder": "H", "Vine": "H", "Hurt": "^", "PieceOfHeart": "A"}


def view(name, v, at=None):
    d = level(name); ts = tileset(d["TrileSetName"]); h, hs, dep, ds = VIEWS[v]
    grid = {}   # (col, y) -> (depth, char); nearest to the camera wins
    def put(pos, ch):
        col, y = int(pos[h] * hs // 1), int(pos[1] // 1); dp = pos[dep] * ds
        if (col, y) not in grid or dp > grid[(col, y)][0]: grid[(col, y)] = (dp, ch)
    for t in d["Triles"]:
        e = ts.get(t["Id"])
        if not e or e.get("Immaterial"): continue
        # Collision is per view: Faces[view] is what Gomez feels from this camera angle. "None" faces are
        # scenery he walks in front of, so they never block or hold him (only tops and walls count).
        face = e["Faces"].get(v, "None")
        ch = MARK.get(e["Type"]) or {"AllSides": "#", "TopOnly": "=", "TopNoStraightLedge": "="}.get(face)
        if ch: put([c + 0.5 for c in t["Position"]], ch)   # centre, so mirrored views land in the right column
    for vol in d["Volumes"].values():
        if v not in vol["Orientations"] and not (vol.get("ActorSettings") or {}).get("IsBlackHole"): continue
        ch = "O" if (vol.get("ActorSettings") or {}).get("IsBlackHole") else None
        if ch is None and any(f"Volume[{k}].Enter" in s["Triggers"] for s in d["Scripts"].values() for k in [next(i for i, x in d["Volumes"].items() if x is vol)] if any("ChangeLevel" in a or "ChangeToFarAway" in a for a in s["Actions"])): ch = "D"
        if ch: put([(a + b) / 2 for a, b in zip(vol["From"], vol["To"])], ch)
    if at: grid[(int(at[h] * hs // 1), int(at[1] // 1))] = (1e9, "@")
    cols = [c for c, _ in grid]; ys = [y for _, y in grid]
    for y in range(max(ys), min(ys) - 1, -1):
        row = "".join(grid.get((c, y), (0, " "))[1] for c in range(min(cols), max(cols) + 1))
        print(f"{y:3} {row.rstrip()}")
    lo, hi = min(cols), max(cols)
    print("    " + "".join("|" if (c * hs) % 5 == 0 else " " for c in range(lo, hi + 1)))
    print("    " + "".join(f"{c * hs:<5}" for c in range(lo, hi + 1) if (c * hs) % 5 == 0)[:hi - lo + 6], f"({'xyz'[h]} at each |, left to right)")


def route(a, b):
    t = json.load(open(DATA / "maptree.fezmap.json")); g = collections.defaultdict(set)
    for n in t.values():
        for c in n["Connections"]:
            x, y = n["LevelName"], t[str(c["Node"])]["LevelName"]; g[x].add(y); g[y].add(x)
    prev, q = {a: None}, [a]
    for x in q:
        for y in g[x]:
            if y not in prev: prev[y] = x; q.append(y)
    p = [b]
    while prev[p[-1]]: p.append(prev[p[-1]])
    return p[::-1]


if __name__ == "__main__":
    c, *a = sys.argv[1:]
    if c == "doors":
        for to, f, t, o in doors(a[0]): print(f"{to:24} from {f} to {t} seen {o}")
    elif c == "route": print(" -> ".join(route(a[0], a[1])))
    elif c == "view": view(a[0], a[1], [float(x) for x in a[2:5]] if len(a) >= 5 else None)

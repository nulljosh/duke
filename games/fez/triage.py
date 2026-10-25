#!/usr/bin/env python3
"""triage.py: for every room with collectibles left in a save, which items the planner can reach from that
room's own doors with no puzzle solving. Cheap wins first.  triage.py SAVE"""
import json, sys
import fezmap, fezsave, plan

PICKUPS = {"CubeShard": "cube", "GoldenCube": "bit", "SecretCube": "anti", "PieceOfHeart": "heart"}


def items(name, collected):
    d = fezmap.level(name); ts = fezmap.tileset(d["TrileSetName"]); out = []
    for t in d["Triles"]:
        e = ts.get(t["Id"])
        if e and e["Type"] in PICKUPS and tuple(t["Emplacement"]) not in collected:
            out.append((PICKUPS[e["Type"]], t["Position"]))
    return out


def starts(name):
    for dest, f, t, views in fezmap.doors(name):
        v = views[0]; hi, hs, di, _ = fezmap.VIEWS[v]
        yield dest, v, (int(((f[hi] + t[hi]) / 2) * hs // 1), round(f[1]), int(((f[di] + t[di]) / 2) // 1))


if __name__ == "__main__":
    sd = fezsave.read(sys.argv[1]); tree = json.load(open(fezsave.MAPTREE))
    for name, seen, gap, _ in fezsave.missing(sd, tree):
        try: its = items(name, set())   # ponytail: per-room collected triles are not decoded yet, so visited rooms list everything
        except FileNotFoundError: continue
        if not its: continue
        got = []
        for kind, pos in its:
            for dest, v, st in starts(name):
                try: p = plan.find_item(name, v, st, pos)
                except Exception: p = None
                if p is not None: got.append((kind, dest, len(p))); break
        print(f"{name:24} {'seen' if seen else 'new '} needs {gap}  items {len(its)}  reachable {len(got)} {got[:4]}")

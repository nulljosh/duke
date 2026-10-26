#!/usr/bin/env python3
"""trip.py: room to room on top of go.py: through a door, along the map route, and to the items in a room.
  trip.py travel LEVEL | door LEVEL | collect | sweep LEVEL..."""
import sys, time
from pathlib import Path
import fez, fezmap, plan
from go import go, turn_to
from plan import iround


def door(to):
    lvl = fez.state()["level"]
    for dest, f, t, views in fezmap.doors(lvl):
        if dest != to: continue
        v = views[0]; hi, hs, _, _ = fezmap.VIEWS[v]
        col = int(((f[hi] + t[hi]) / 2) * hs // 1); y = iround(f[1])
        if go((col, y), v) is None:   # no plan to the door's cell, but he often stands a step away from it (Mausoleum, Owl)
            p = fez.state()["pos"]
            if not all(a - 2.5 <= q <= b + 2.5 for q, a, b in zip(p, f, t)): return None
            turn_to(v)
        fez.walk(((f[hi] + t[hi]) / 2) * hs, tol=0.15)   # the door's centre, not its grid column: thin doors sit on a cell edge
        fez.key("up", 150); time.sleep(6); s = fez.state()
        if s["level"] == lvl:   # behind the door in depth (Mine A, 2026-10-25): step to its depth from a side view, then retry
            side = plan.ORDER[(plan.ORDER.index(v) + 1) % 4]; shi, shs, _, _ = fezmap.VIEWS[side]
            turn_to(side); fez.walk(((f[shi] + t[shi]) / 2) * shs, tol=0.2)
            turn_to(v); fez.walk(col + 0.5, tol=0.2); fez.key("up", 150); time.sleep(6); s = fez.state()
        return s


def collect():
    """Go to the nearest uncollected item the bridge reports and jump for it."""
    s = fez.state(); before = (s["cubes"], s["anti"], s["bits"])
    items = s["items"]
    if not items: return None
    for it in sorted(items, key=lambda i: sum((a - b) ** 2 for a, b in zip(i["pos"], s["pos"]))):   # nearest first, skip the unreachable
        print("going for", it, flush=True)
        s = go(None, item=it["pos"])
        if s is not None: break
    else: return None
    for i in range(4):
        hi, hs, _, _ = fezmap.VIEWS[s["view"]]
        fez.walk((it["pos"][hi] + 0.5) * hs + (0, 0.3, -0.3, 0)[i], tol=0.1)   # stand right under it: a jump off-centre can miss
        fez.key("space", 300); time.sleep(1.2); s = fez.state()
        if (s["cubes"], s["anti"], s["bits"]) != before: print("collected!", s["cubes"], s["anti"], s["bits"]); fez.snapshot(); return s
    return s


HAND = {("ZU_CITY", "MEMORY_CORE"): ("zu_city", "down"), ("THRONE", "TREE_SKY"): ("throne", "to_tree_sky"),   # legs the planner fails, done by hand
        ("TREE_SKY", "TREE"): ("tree_sky", "to_tree"), ("TELESCOPE", "OBSERVATORY"): ("telescope", "out"),
        ("TREE_ROOTS", "TREE"): ("tree_roots", "up"), ("BIG_TOWER", "MEMORY_CORE"): ("big_tower", "up"), ("TREE_ROOTS", "NATURE_HUB"): ("tree_roots", "down"), ("NATURE_HUB", "WATERFALL"): ("nature_hub", "to_waterfall")}


def hand(here, nxt):
    import importlib
    sys.path.insert(0, str(Path(__file__).resolve().parent / "routes"))
    mod, fn = HAND[(here, nxt)]
    try: getattr(importlib.import_module(mod), fn)()
    except Exception as e: print("hand route failed:", e, flush=True)
    for k in fez.CODES: fez.edge(k, False)
    return fez.state()


def travel(to):
    """Door to door along the map-tree route until Gomez is in `to`."""
    for _ in range(20):
        here = fez.state()["level"]
        if here == to: return fez.state()
        try: nxt = fezmap.route(here, to)[1]
        except (KeyError, IndexError): print("no known route", here, "->", to, flush=True); return None
        print(f"{here} -> {nxt}", flush=True)
        fez.revive()
        s = hand(here, nxt) if (here, nxt) in HAND else None
        if s is None or s["level"] != nxt: s = door(nxt)
        if s is None or s["level"] != nxt:
            print("stuck going", here, "->", nxt, flush=True)
            if not fez.responsive(): fez.revive(); continue   # dead input, not a locked door
            if s is not None and s["level"] == here and s.get("door") is not None: fezmap.block(here, nxt)   # stood in it and it would not open: route around next time
            return None
    return None


def sweep(level):
    """Travel to `level` and collect every pickup the bridge shows there."""
    if travel(level) is None: return None
    for _ in range(12):
        s = fez.state()
        if not s["items"]: print("room clear:", level, s["cubes"], s["anti"], s["bits"], flush=True); return s
        if collect() is None: print("could not reach", s["items"][0], flush=True); return s
    return fez.state()


if __name__ == "__main__":
    for k in fez.CODES: fez.edge(k, False)   # a killed run leaves keys held; Gomez then runs off ledges after every respawn
    if sys.argv[1] == "sweep":
        for lv in sys.argv[2:]: s = sweep(lv)
    elif sys.argv[1] == "travel": s = travel(sys.argv[2])
    elif sys.argv[1] == "collect": s = collect()
    elif sys.argv[1] == "door": s = door(sys.argv[2])
    print(s and (s["level"], s["view"], s["action"], s["pos"]))

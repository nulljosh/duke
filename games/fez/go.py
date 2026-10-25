#!/usr/bin/env python3
"""go.py: walk Gomez to a spot in the current level with the planner, replanning after every surprise.
  go.py COL Y [VIEW]        target column (screen units in VIEW) and floor height
  go.py door LEVEL          the door in this level that leads to LEVEL, then go through it"""
import sys, time
import fez, fezmap, plan


def node(s):
    """Planner node for Gomez now. Teetering at an edge puts his centre past the last floor cell, so snap back to it."""
    di = fezmap.VIEWS[s["view"]][2]; x = fez.h(s); y = round(s["pos"][1] - 0.47)
    c = int(x // 1)
    try:
        g = plan.grid(s["level"], s["view"])
        if not plan.standable(g, c, y):
            for cc in (int((x - 0.5) // 1), int((x + 0.5) // 1)):
                if plan.standable(g, cc, y): c = cc; break
    except FileNotFoundError: pass
    return (s["view"], c, y, int(s["pos"][di] // 1))


def turn_to(v):
    for _ in range(4):
        s = fez.state()
        if s["view"] == v: return s
        cur, want = plan.ORDER.index(s["view"]), plan.ORDER.index(v)
        fez.key("d" if (want - cur) % 4 == 1 else "a", 150); time.sleep(1.5)
    return fez.state()


def landed(timeout=4):
    """Wait until Gomez is standing (or hanging) again; a death waits out the respawn."""
    t0 = time.time(); s = fez.state()
    while time.time() - t0 < timeout and not (s["grounded"] or s["action"].startswith("Grab")):
        time.sleep(0.05); s = fez.state()
    time.sleep(0.3); return fez.state()


def settle(s):
    if s["action"].startswith("Grab"): fez.key("up", 150); time.sleep(1.3); s = fez.state()
    return s


def step(kind, v, c, y):
    s = fez.state(); here = node(s); target = c + 0.5
    if kind.startswith("turn"): return turn_to(v)
    if kind == "walk": return fez.walk(target)
    if kind == "climb":
        k = "up" if y > here[2] else "down"; fez.edge(k, True); t0 = time.time()
        while time.time() - t0 < 3 and round(fez.state()["pos"][1] - 0.47) != y: time.sleep(0.03)
        fez.edge(k, False); time.sleep(0.3); return fez.state()
    if kind == "drop":   # step off toward the target column and let go once over it
        d = "right" if target > fez.h(s) else "left"; sign = 1 if d == "right" else -1
        fez.edge(d, True); t0 = time.time()
        while time.time() - t0 < 3:
            s = fez.state()
            if (fez.h(s) - target) * sign >= -0.35: fez.edge(d, False)
            if time.time() - t0 > 0.3 and (s["grounded"] or s["action"].startswith(("Grab", "Dying"))): break
            time.sleep(0.02)
        fez.edge(d, False); return settle(landed())
    if kind == "hop":
        up = y - here[2]
        return settle(fez.hop(target, jump_ms=450 if up > 0 else 250 if up == 0 else 120, lead=0.5))


def go(goal, goal_view=None, tries=12, item=None):
    for attempt in range(tries):
        s = fez.state()
        while s["action"] in ("Dying", "FreeFalling") or not s["grounded"]: time.sleep(0.3); s = fez.state()
        v, c, y, dep = node(s)
        if goal is not None and (c, y) == goal and goal_view in (None, v): return s
        p = plan.find_item(s["level"], v, (c, y, dep), item) if item else plan.find(s["level"], v, (c, y, dep), goal, goal_view)
        if p == []: return s
        if p is None: print("no path from", node(s), "to", goal); return None
        print(f"plan {attempt}: " + " | ".join(f"{k} {vv} {cc},{yy}" for k, (vv, cc, yy, _) in plan.compress(p)))
        for kind, (vv, cc, yy, _) in plan.compress(p):
            s = step(kind, vv, cc, yy)
            got = node(s)
            if (got[0], got[1], got[2]) != (vv, cc, yy):
                print(f"  {kind} to {vv} {cc},{yy} landed {got} ({s['action']}), replanning"); break
        else:
            return fez.state()
    return None


def door(to):
    lvl = fez.state()["level"]
    for dest, f, t, views in fezmap.doors(lvl):
        if dest != to: continue
        v = views[0]; hi, hs, _, _ = fezmap.VIEWS[v]
        col = int(((f[hi] + t[hi]) / 2) * hs // 1); y = round(f[1])
        if go((col, y), v) is None: return None
        fez.key("up", 150); time.sleep(6); return fez.state()


def collect():
    """Go to the nearest uncollected item the bridge reports and jump for it."""
    s = fez.state(); before = (s["cubes"], s["anti"], s["bits"])
    items = s["items"]
    if not items: return None
    it = min(items, key=lambda i: sum((a - b) ** 2 for a, b in zip(i["pos"], s["pos"])))
    print("going for", it)
    s = go(None, item=it["pos"])
    if s is None: return None
    for _ in range(3):
        fez.key("space", 300); time.sleep(1.2); s = fez.state()
        if (s["cubes"], s["anti"], s["bits"]) != before: print("collected!", s["cubes"], s["anti"], s["bits"]); return s
    return s


if __name__ == "__main__":
    if sys.argv[1] == "collect": s = collect()
    elif sys.argv[1] == "door": s = door(sys.argv[2])
    else: s = go((int(sys.argv[1]), int(sys.argv[2])), sys.argv[3] if len(sys.argv) > 3 else None)
    print(s and (s["level"], s["view"], s["action"], s["pos"]))

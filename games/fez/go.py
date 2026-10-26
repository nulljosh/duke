#!/usr/bin/env python3
"""go.py: walk Gomez to a spot in the current level with the planner, replanning after every surprise.
  go.py COL Y [VIEW]        target column (screen units in VIEW) and floor height
  go.py door LEVEL          the door in this level that leads to LEVEL, then go through it"""
import subprocess, sys, time
import fez, fezmap, plan
from plan import iround


def node(s):
    """Planner node for Gomez now. Teetering at an edge puts his centre past the last floor cell, so snap back to it."""
    di = fezmap.VIEWS[s["view"]][2]; x = fez.h(s); y = iround(s["pos"][1] - 0.4)
    c = int(x // 1)
    try:
        g = plan.grid(s["level"], s["view"])
        if s["action"] == "Bouncing":   # mid-bounce: he belongs to the mushroom under him
            for yy in range(y, y - 12, -1):
                if plan.bouncy(g, c, yy): y = yy; break
        elif "Climb" in s["action"]:   # on a vine: use the nearest vine cell the planner knows about
            cl = plan.CLIMB[(s["level"], s["view"])]
            best = min(cl, key=lambda q: (q[0] + 0.5 - x) ** 2 + (q[1] - y) ** 2, default=None)
            if best and abs(best[0] + 0.5 - x) <= 1.6 and abs(best[1] - y) <= 2: c, y = best
        elif not plan.standable(g, c, y):
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


def letgo():
    """Down + Jump drops Gomez off a vine (measured in Tree Sky, 2026-10-25)."""
    fez.edge("down", True); time.sleep(0.1); fez.key("space", 60); time.sleep(0.2); fez.edge("down", False)
    return landed()


def settle(s):
    if s["action"].startswith("Grab"): fez.key("up", 150); time.sleep(1.3); s = fez.state()
    elif s["action"].startswith("PullUp"): time.sleep(1.0); s = fez.state()   # already climbing over the ledge
    return s


def mover_under(s):
    """The bobbing platform Gomez stands on, as (bridge mover, its peak top y), or None."""
    bob = plan.bobbers(s["level"]); x, fy, z = s["pos"]
    for m in s.get("movers", []):
        if m["id"] in bob and m["from"][0] - 0.3 <= x <= m["to"][0] + 0.3 and m["from"][2] - 0.3 <= z <= m["to"][2] + 0.3 and abs(m["to"][1] - fy) < 0.8:
            cells, rise = bob[m["id"]]; return m, max(y for _, y, _ in cells) + 1 + rise
    return None


def ride_to_peak(timeout=5):
    """On a bobbing pillar, wait for the top of its swing before jumping (Zu City, 2026-10-25)."""
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = fez.state(); m = mover_under(s)
        if m is None: return
        mm = next(q for q in s["movers"] if q["id"] == m[0]["id"])
        if mm["to"][1] >= m[1] - 0.12: return
        time.sleep(0.03)


def step(kind, v, c, y):
    s = fez.state()
    if "Climb" in s["action"] and kind not in ("climb", "release", "vinejump") and not kind.startswith("turn"):   # standing moves need ground
        letgo(); s = fez.state()
    here = node(s); target = c + 0.5
    if kind.startswith("turn"): return turn_to(v)
    if kind in ("walk", "swim"): return fez.walk(target)
    if kind == "climb":   # along a vine: up/down until the height matches, sideways until the column does
        if y != here[2]:
            k = "up" if y > here[2] else "down"; fez.edge(k, True); t0 = time.time()
            while time.time() - t0 < 3 and iround(fez.state()["pos"][1] - 0.4) != y: time.sleep(0.03)
        else:
            k = "right" if target > fez.h(s) else "left"; sign = 1 if k == "right" else -1; fez.edge(k, True); t0 = time.time()
            while time.time() - t0 < 3 and (fez.h(fez.state()) - target) * sign < -0.3: time.sleep(0.03)
        fez.edge(k, False); time.sleep(0.3); return settle(fez.state())
    if kind == "grab":    # jump at a vine holding Up so Gomez catches it
        d = "right" if target > fez.h(s) else "left" if target < fez.h(s) - 0.3 else None; sign = 1 if d == "right" else -1
        below = y < here[2]; up_held = not below
        if up_held: fez.edge("up", True)   # for a vine below, hold Up only once level with it, or he grabs the one beside him
        if d: fez.edge(d, True)
        time.sleep(0.04); fez.edge("space", True); t0 = time.time()
        while time.time() - t0 < 2:
            s = fez.state()
            if not up_held and s["pos"][1] < y + 1.5: fez.edge("up", True); up_held = True
            if time.time() - t0 > 0.3: fez.edge("space", False)
            if d and (fez.h(s) - target) * sign >= -0.4: fez.edge(d, False)
            if "Climb" in s["action"] or (time.time() - t0 > 0.3 and s["grounded"]): break
            time.sleep(0.02)
        for k in ("space", "up", "left", "right"): fez.edge(k, False)
        time.sleep(0.2); return fez.state()
    if kind.startswith("dropback"):   # walk off the edge, then steer back under it to the target column
        out = kind.split("-")[1]; back = "left" if out == "right" else "right"; sign = 1 if back == "right" else -1
        t0 = time.time()   # creep: full speed carries Gomez too far out to steer back under the ledge
        while fez.state()["grounded"] and time.time() - t0 < 4:
            fez.edge(out, True); time.sleep(0.05); fez.edge(out, False); time.sleep(0.12)
        fez.edge(back, True); let_go = False   # steer back at once: a 5-unit drop leaves under half a second
        while time.time() - t0 < 6:
            s = fez.state()
            if s["action"].startswith("Grab") and not let_go:   # a slow step off hangs from the ledge: let go with Down
                fez.key("down", 80); let_go = True; continue
            if (fez.h(s) - target) * sign >= -0.3: fez.edge(back, False)
            if s["grounded"] or s["action"].startswith(("Grab", "Dying")): break
            time.sleep(0.02)
        fez.edge(back, False); return settle(landed())
    if kind == "bounce":   # Gomez is bouncing on a mushroom: on the way down, steer to the target column
        d = "right" if target > fez.h(s) else "left"; sign = 1 if d == "right" else -1; t0 = time.time(); held = False
        while time.time() - t0 < 5:
            s = fez.state()
            if not held and not s["grounded"]: fez.edge(d, True); held = True   # steer from the launch, as in the hand trace
            if held and (fez.h(s) - target) * sign >= -0.8: fez.edge(d, False)   # momentum carries the last ~0.8
            if held and time.time() - t0 > 0.4 and (s["grounded"] or s["action"] in ("Bouncing", "Dying")) and abs(fez.h(s) - target) < 1.2: break
            time.sleep(0.02)
        fez.edge(d, False); time.sleep(0.2); return fez.state()
    if kind == "dropgrab":   # walk off the edge holding Up, steer over the vine column, catch it
        d = "right" if target > fez.h(s) else "left"; sign = 1 if d == "right" else -1
        y0 = s["pos"][1]; fez.edge(d, True); t0 = time.time(); up = False
        while time.time() - t0 < 3:
            s = fez.state()
            if (fez.h(s) - target) * sign >= -0.3: fez.edge(d, False)
            if not up and s["pos"][1] < min(y0 - 1.5, y + 1.5): fez.edge("up", True); up = True   # holding Up too early re-grabs the vine above
            if "Climb" in s["action"] or (time.time() - t0 > 0.4 and s["grounded"]) or s["action"] == "Dying": break
            time.sleep(0.02)
        fez.edge(d, False); fez.edge("up", False); time.sleep(0.2); return fez.state()
    if kind == "vinejump":   # jump off the vine toward a ledge above, hold Up to catch it
        d = "right" if target > fez.h(s) + 0.3 else "left" if target < fez.h(s) - 0.3 else None
        fez.edge("up", True)
        if d: fez.edge(d, True)
        fez.edge("space", True); time.sleep(0.45); fez.edge("space", False)
        s = landed(3)
        for k in ("up", "left", "right"): fez.edge(k, False)
        return settle(s)
    if kind == "release":   # let go of the vine and land below
        letgo(); return settle(fez.state())
    if kind == "drop":   # step off toward the target column and let go once over it
        d = "right" if target > fez.h(s) else "left"; sign = 1 if d == "right" else -1
        fez.edge(d, True); t0 = time.time(); air = False
        while time.time() - t0 < 4:
            s = fez.state()
            air = air or not s["grounded"]
            if (fez.h(s) - target) * sign >= -0.35: fez.edge(d, False)
            if air and (s["grounded"] or s["action"] == "Bouncing" or s["action"].startswith(("Grab", "Dying"))): break   # left the ground, then landed
            time.sleep(0.02)
        fez.edge(d, False)
        return fez.state() if fez.state()["action"] == "Bouncing" else settle(landed())
    if kind == "hop":
        up = y - here[2]
        if up > 0: ride_to_peak(); s = fez.state()
        if s["action"] in ("Treading", "Swimming") or up >= 3:   # +3 (and out of water) only by catching the ledge: hold Up, long jump (Nature Hub, 2026-10-25)
            fez.edge("up", True); s = fez.hop(target, jump_ms=600, lead=0.5); fez.edge("up", False); return settle(landed(2))
        return settle(fez.hop(target, jump_ms=450 if up > 0 else 250 if up == 0 else 120, lead=0.5))


def go(goal, goal_view=None, tries=8, item=None):
    for attempt in range(tries):
        s = fez.state()
        t0 = time.time()   # wait out falls and respawns; hanging on a vine or ledge counts as settled
        while (s["action"] in ("Dying", "FreeFalling") or not (s["grounded"] or s["action"] in ("Bouncing", "Treading", "Swimming") or "Climb" in s["action"] or s["action"].startswith("Grab"))) and time.time() - t0 < 10:
            time.sleep(0.3); s = fez.state()
        plan.HOLES[s["level"]] = [(h["from"], h["to"]) for h in s.get("holes", []) if h["on"]]
        v, c, y, dep = node(s)
        if s["grounded"] and not plan.standable(plan.grid(s["level"], v), c, y):   # this view's grid misreads the floor: try another camera
            for alt in plan.ORDER:
                if alt != v and (s := turn_to(alt)) and plan.standable(plan.grid(s["level"], alt), *node(s)[1:3]): break
            v, c, y, dep = node(s)
        if "Climb" in s["action"] and plan.standable(plan.grid(s["level"], v), c, y):   # on a vine right above a floor: step down onto it
            letgo(); s = fez.state(); v, c, y, dep = node(s)
        if goal is not None and (c, y) == goal and goal_view in (None, v): return s
        p = plan.find_item(s["level"], v, (c, y, dep), item) if item else plan.find(s["level"], v, (c, y, dep), goal, goal_view)
        if p == []: return s
        if p is None and any(b[0] == s["level"] for b in plan.BANNED):   # bans can be timing flukes (bobbing pillars): forgive them once
            plan.BANNED -= {b for b in plan.BANNED if b[0] == s["level"]}; plan.BANS.write_text("".join(repr(b) + "\n" for b in plan.BANNED))
            print("no path with bans: cleared this level's bans", flush=True); continue
        if p is None:
            if any(h["on"] for h in s.get("holes", [])) and attempt < tries - 1:   # black holes re-roll on every level load
                print("no path while black holes are on: restarting FEZ to re-roll them", flush=True)
                subprocess.run(["pkill", "-x", "HAT.bin.osx"]); time.sleep(2); fez.start(); continue
            print("no path from", node(s), "to", goal); return None
        first = plan.compress(p)[0][0] if p else ""
        if "Climb" in s["action"] and first not in ("climb", "release", "vinejump") and not first.startswith("turn"):
            letgo(); continue
        print(f"plan {attempt}: " + " | ".join(f"{k} {vv} {cc},{yy}" for k, (vv, cc, yy, _) in plan.compress(p)))
        prev = (v, c, y, dep)
        for kind, (vv, cc, yy, _) in plan.compress(p):
            s = step(kind, vv, cc, yy)
            t1 = time.time()
            while s["action"].startswith(("JumpTo", "Landing")) and time.time() - t1 < 1.5: time.sleep(0.05); s = fez.state()   # let a vine catch finish
            if s["action"].startswith(("Grab", "PullUp")) and kind not in ("grab", "climb", "dropgrab"): s = settle(s)   # caught a ledge: pull up first
            got = node(s)
            if got[0] == vv and got[2] == yy and abs(got[1] - cc) == 1 and s["grounded"]:   # right floor, one column off: walk the rest
                s = fez.walk(cc + 0.5); got = node(s)
            close = (kind in ("grab", "climb", "dropgrab") and "Climb" in s["action"] and got[0] == vv and abs(got[1] - cc) <= 1 and abs(got[2] - yy) <= 1) \
                or (s["action"] == "Bouncing" and got[0] == vv and abs(got[1] - cc) <= 1) \
                or (mover_under(s) is not None and got[0] == vv and got[1] == cc and abs(got[2] - yy) <= 1)
            if (got[0], got[1], got[2]) != (vv, cc, yy) and not close:
                plan.ban((s["level"], prev, kind, (vv, cc, yy)))   # never plan this exact move from here again
                print(f"  {kind} to {vv} {cc},{yy} landed {got} ({s['action']}), banned, replanning"); break
            prev = got
        else:
            return fez.state()
    return None


def door(to):
    lvl = fez.state()["level"]
    for dest, f, t, views in fezmap.doors(lvl):
        if dest != to: continue
        v = views[0]; hi, hs, _, _ = fezmap.VIEWS[v]
        col = int(((f[hi] + t[hi]) / 2) * hs // 1); y = iround(f[1])
        if go((col, y), v) is None: return None
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
        if (s["cubes"], s["anti"], s["bits"]) != before: print("collected!", s["cubes"], s["anti"], s["bits"]); return s
    return s


def travel(to):
    """Door to door along the map-tree route until Gomez is in `to`."""
    for _ in range(20):
        here = fez.state()["level"]
        if here == to: return fez.state()
        nxt = fezmap.route(here, to)[1]
        print(f"{here} -> {nxt}", flush=True)
        s = door(nxt)
        if s is None or s["level"] != nxt: print("stuck going", here, "->", nxt); return None
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
    else: s = go((int(sys.argv[1]), int(sys.argv[2])), sys.argv[3] if len(sys.argv) > 3 else None)
    print(s and (s["level"], s["view"], s["action"], s["pos"]))

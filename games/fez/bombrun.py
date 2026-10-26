#!/usr/bin/env python3
"""bombrun.py: Mine Wrap's first bomb: from the right-hand post, carry it across the gap and blow the bricks.
Explosions are screen-space 3x3 around the bomb and chain through connected breakables (BombsHost.DestroyNeighborhood),
the fuse is 6 s from pickup, so the jump is timed to put the bomb level with the bricks when it goes."""
import time, fez, go


def log(t0, m):
    s = fez.state(); print(round(time.time() - t0, 2), m, s["view"], s["action"], [round(v, 2) for v in s["pos"]], round(fez.h(s), 2), flush=True); return s


def pickup(at, face="right", tries=4):
    for _ in range(tries):
        fez.walk(at, tol=0.08); fez.key(face, 30); time.sleep(0.25)
        fez.key("ctrl", 200); t = time.time(); time.sleep(0.8)
        if any(k in fez.state()["action"] for k in ("Lift", "Carry")): return t
        time.sleep(1.5)
    return None


def run(take_off=-6.3, stop=-14.3, blow_at=5.55, turn=False):
    t0 = time.time()
    go.go((-6, 36), "Right"); tp = pickup(-5.0)
    if tp is None: return log(t0, "no bomb")
    while fez.state()["action"] == "Lifting" and time.time() - tp < 2: time.sleep(0.03)
    fez.edge("left", True); jumped = None
    while time.time() - tp < 5.0:
        s = fez.state(); x = fez.h(s)
        if jumped is None and x < take_off: fez.edge("space", True); jumped = time.time()
        if jumped and time.time() - jumped > 0.5: fez.edge("space", False)
        if x <= stop and s["grounded"]: break
        time.sleep(0.02)
    fez.edge("left", False); fez.edge("space", False); log(tp, "under bricks")
    if turn:   # the bit's inner wall faces the Left camera: blow it from there (Right -> Back -> Left)
        for _ in range(2): fez.key("d", 120); time.sleep(0.5)
        time.sleep(2.5); return log(tp, "after (Left)")
    while time.time() - tp < blow_at: time.sleep(0.01)
    fez.edge("space", True); time.sleep(0.45); fez.edge("space", False)
    time.sleep(2.5); return log(tp, "after")


def run_left(take_off=6.3, stop=14.0):
    """The bit's inner wall only faces the Left camera: pick up in Right view, turn twice while carrying, run right."""
    tp = None
    go.go((-6, 36), "Right"); tp = pickup(-5.0)
    if tp is None: return log(time.time(), "no bomb")
    while fez.state()["action"] == "Lifting" and time.time() - tp < 2: time.sleep(0.03)
    for _ in range(2): fez.key("d", 150); time.sleep(0.6)
    log(tp, "turned")
    fez.edge("right", True); jumped = None
    while time.time() - tp < 5.6:
        s = fez.state(); x = fez.h(s)
        if jumped is None and x > take_off: fez.edge("space", True); jumped = time.time()
        if jumped and time.time() - jumped > 0.5: fez.edge("space", False)
        if x >= stop and s["grounded"]: break
        time.sleep(0.02)
    fez.edge("right", False); fez.edge("space", False); log(tp, "at wall")
    time.sleep(3); return log(tp, "after")


if __name__ == "__main__":
    import sys
    run(stop=-13.8, turn=True) if sys.argv[1:] == ["left"] else run()

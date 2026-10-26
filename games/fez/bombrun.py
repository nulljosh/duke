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


def mine_a_bit():
    """Mine A's walled-in bit: its bricks face the Left camera from the y42 ledge, the bomb sits on the top floor.
    Gomez cannot climb with a bomb, so: lift in Back view, turn to Right, step off the ladder end, turn to Front
    in mid-air (the view can turn while falling), land on the y42 ledge, turn to Left and walk under the bricks."""
    def rot(k, want):
        fez.key(k, 60); t = time.time()
        while time.time() - t < 1.5 and fez.state()["view"] != want: time.sleep(0.02)
    go.turn_to("Back"); fez.walk(-18.5, tol=0.08); time.sleep(0.2)
    fez.key("ctrl", 120); tp = time.time()
    while time.time() - tp < 2.5 and fez.state()["action"] != "CarryIdle": time.sleep(0.02)
    rot("a", "Right"); fez.edge("right", True); r = False
    while time.time() - tp < 7:
        s = fez.state()
        if not r and not s["grounded"]: fez.edge("right", False); fez.key("a", 60); r = True
        if r and s["grounded"]: break
        time.sleep(0.02)
    fez.edge("right", False)
    rot("a", "Left"); fez.walk(26.3, tol=0.2, timeout=1.4)
    time.sleep(3); return log(tp, "after")


def wrap_bit5(stand=32.4, take_off=24.1, blow=4.66):
    """Mine Wrap's second bit sits behind bricks (27-31, 41-42) above the door lintel. A blast scans each screen cell
    from the camera and stops at the first solid non-brick tile (BombsHost.DestroyNeighborhood), so the Front walls
    block it. From the Back camera, bricks step up unbroken: (30-34, 39-40, z12) then the bit's own rows 41-42.
    So: lift the left post's bomb in Front view (standing on it), jump the gap, stop under x32, turn twice to Back,
    and jump so the bomb is at the top of the jump when it goes. Fuse: 4.0 s plus about 0.33 s per camera turn."""
    t0 = time.time()
    go.go((21, 36), "Front"); tp = pickup(22.1, "right")   # lifts only when standing on the bomb
    if tp is None: return log(t0, "no bomb")
    while fez.state()["action"] == "Lifting" and time.time() - tp < 2: time.sleep(0.03)
    fez.edge("right", True); jumped = None
    while time.time() - tp < 3.4:
        s = fez.state(); x = fez.h(s)
        if jumped is None and x > take_off: fez.edge("space", True); jumped = time.time()
        if jumped and time.time() - jumped > 0.5: fez.edge("space", False)
        if jumped and x >= stand - 0.5: break
        time.sleep(0.02)
    fez.edge("right", False); fez.edge("space", False)
    fez.walk(stand, tol=0.15, timeout=0.6); log(tp, "under bricks")
    for want in ("Right", "Back"):
        fez.key("d", 60); t = time.time()
        while time.time() - t < 1.5 and fez.state()["view"] != want: time.sleep(0.02)
    log(tp, "back")
    while time.time() - tp < blow - 0.5: time.sleep(0.01)
    fez.edge("space", True); t = time.time(); peak = 0; acts = []
    while time.time() - t < 1.6:
        s = fez.state(); peak = max(peak, s["pos"][1])
        if not acts or acts[-1][1] != s["action"]: acts.append((round(time.time() - tp, 2), s["action"], round(s["pos"][1], 2)))
        time.sleep(0.02)
    fez.edge("space", False); print(acts); time.sleep(3); return log(tp, f"after, peak {round(peak, 2)}")


def wrap_chain(turns=(1.0, 2.2, 3.2), take_off=24.1):
    """Mine Wrap's tower bricks are ONE group (56 bricks) wrapped around all four faces, and a group only stays
    gone if every brick goes; otherwise all of it respawns 1.5 s after the last one breaks (BombsHost.ClearDestructible).
    A blast stops at the first solid non-brick tile from the camera, so each face can only burn while the camera
    looks at it. Start at floor level on the right face (x34, z15-16, y36-38) in Right view, then turn Back, Left
    and Front as the chain climbs and wraps round. The bit sits behind the last face, the front row above the door."""
    t0 = time.time()
    go.go((21, 36), "Front"); tp = pickup(22.1, "right")
    if tp is None: return log(t0, "no bomb")
    while fez.state()["action"] == "Lifting" and time.time() - tp < 2: time.sleep(0.03)
    fez.edge("right", True); jumped = None
    while time.time() - tp < 3.3:
        s = fez.state(); x = fez.h(s)
        if jumped is None and x > take_off: fez.edge("space", True); jumped = time.time()
        if jumped and time.time() - jumped > 0.5: fez.edge("space", False)
        if jumped and x >= 29.5 and s["grounded"]: break
        time.sleep(0.02)
    fez.edge("right", False); fez.edge("space", False)
    while time.time() - tp < 3.6 and not (fez.state()["grounded"] and "Jump" not in fez.state()["action"]): time.sleep(0.02)
    if fez.h(fez.state()) < 28: return log(tp, "short of the floor, abort")   # turning off the x27 lip drops him
    fez.key("d", 60); t = time.time()
    while time.time() - t < 1.5 and fez.state()["view"] != "Right": time.sleep(0.02)
    fez.walk(-15.5, tol=0.2, timeout=1.6); log(tp, "under right face")
    while time.time() - tp < 6 and fez.state()["action"] != "Suffering": time.sleep(0.01)
    tb = time.time(); log(tp, "boom")
    for at, want in zip(turns, ("Back", "Left", "Front")):
        while time.time() - tb < at: time.sleep(0.01)
        fez.key("d", 60); t = time.time()
        while time.time() - t < 1.5 and fez.state()["view"] != want: time.sleep(0.02)
    time.sleep(2.5); fez.shot("chain"); return log(tp, "after")


def _jump(d=None, dir_ms=None, hold=1.4):
    if d: fez.edge(d, True)
    fez.edge("space", True); t0 = time.time()
    while time.time() - t0 < hold:
        if d and dir_ms and time.time() - t0 > dir_ms / 1000: fez.edge(d, False)
        s = fez.state()
        if time.time() - t0 > 0.3 and (s["grounded"] or s["action"].startswith("Grab")): break
        time.sleep(0.02)
    if d: fez.edge(d, False)
    fez.edge("space", False); time.sleep(0.5); return fez.state()


def wrap_top():
    """Mine Wrap's top floor (y43), once wrap_chain() has cleared the tower bricks. Floor -> minecart (x36) ->
    door lintel by a corner grab in Right view -> the bit's empty niche (stand y41) -> jump out left past the
    floor's left edge (x25.5) and turn back right on the way down, which is the only way a corner grab catches."""
    s = fez.state()
    if s["pos"][1] < 40.2 and s["pos"][0] < 25:   # respawned on the left post
        go.turn_to("Front"); fez.walk(21.5, tol=0.2); fez.runjump(24.1, 28.5)
    go.turn_to("Right")
    for _ in range(5):
        s = fez.state()
        if s["pos"][1] > 40: break
        if s["pos"][1] < 37.5: fez.walk(-22.0); _jump()
        s = _jump("right", dir_ms=260)
        if s["action"].startswith("Grab"): fez.key("up", 150); time.sleep(1.5)
    go.turn_to("Front")
    if fez.state()["pos"][1] < 41: fez.walk(30.5, tol=0.1); _jump()
    fez.walk(27.25, tol=0.08)
    fez.edge("left", True); fez.edge("space", True); t0 = time.time(); turned = False
    while time.time() - t0 < 1.4:
        s = fez.state()
        if not turned and fez.h(s) <= 26.0: fez.edge("left", False); fez.edge("right", True); turned = True
        if s["action"].startswith("Grab") or (time.time() - t0 > 0.3 and s["grounded"]): break
        time.sleep(0.01)
    for k in ("left", "right", "space"): fez.edge(k, False)
    if fez.state()["action"].startswith("Grab"): fez.key("up", 150); time.sleep(1.5)
    return fez.state()

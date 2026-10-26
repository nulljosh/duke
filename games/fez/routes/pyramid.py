"""PYRAMID: the 32-cube ending (found by hand 2026-10-26, FEZ beaten).
Gravity is low here (a full jump peaks +6.5, air speed carries with almost no drag), so each hop is a run-up, a jump
at the ledge end, letting go of the direction early and a short counter-press to brake. The planner (go.go with
plan.LOWREACH) gets Gomez from the door up the right side to the y113 ledge, where deaths also respawn him. From there:
row 115, the y121 window, row 115 on the far side, row 114, straight up through row 119, row 125, up through the
y132 and y138 slabs (one-way), hop the pyramid steps to the top, onto the owl's head (y162, side view), and a jump
with Up held floats him into the Mother Cube."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def lowhop(start, jump_at, center, release_d, brake_d=0.6, view=None):
    if view: go.turn_to(view)
    fez.walk(start, tol=0.15)
    sign = 1 if center > start else -1; d, o = ("right", "left") if sign > 0 else ("left", "right")
    fez.edge(d, True); t0 = time.time(); j = None; brake = False; held = True
    while time.time() - t0 < 6:
        s = fez.state(); x = fez.h(s); i, sg = fez.AXIS[s["view"]]
        if j is None and (x - jump_at) * sign >= 0: fez.edge("space", True); j = time.time()
        if j and time.time() - j > 0.5: fez.edge("space", False)
        if held and (x - (center - sign * release_d)) * sign >= 0: fez.edge(d, False); held = False
        if not brake and (x - (center - sign * brake_d)) * sign >= 0: fez.edge(o, True); brake = True
        if brake is True and s["vel"][i] * sg * sign <= 0.002: fez.edge(o, False); brake = "done"   # held too long it pulls him back off
        if j and time.time() - j > 0.4 and s["grounded"]: break
        time.sleep(0.02)
    for k in ("left", "right", "space"): fez.edge(k, False)
    time.sleep(0.8); return fez.state()


def jump_up(drift=None, ms=600):
    if drift: fez.edge(drift, True); time.sleep(0.15); fez.edge(drift, False)
    fez.edge("space", True); time.sleep(ms / 1000); fez.edge("space", False); return go.landed(5)


def tap_to(tx, ty, timeout=60):
    """Small hops toward column tx until he stands at height ty (the pyramid's +1 steps)."""
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = fez.state(); x = fez.h(s)
        if s["pos"][1] >= ty - 0.2 and abs(x - tx) <= 1.5: return s
        if not s["grounded"]: time.sleep(0.1); continue
        d = "right" if x < tx else "left"
        fez.edge(d, True); fez.key("space", 120); time.sleep(0.25); fez.edge(d, False); time.sleep(0.2)
    return None


def ending():
    """From the y113 ledge (Back -36.5, the respawn spot) to the Mother Cube."""
    lowhop(-37.2, -36.1, -30.0, 3.8, 0.6, "Back")      # row 115
    lowhop(-30.9, -29.4, -25.0, 3.0, 0.6)              # the y121 window
    lowhop(-25.9, -25.85, -19.0, 3.8, 1.0)             # row 115, far side (jump from inside: the window wall stops a run)
    lowhop(20.9, 19.0, 12.5, 3.5, 1.0, "Front")        # row 114
    fez.walk(9.6, tol=0.15); jump_up(ms=600)           # straight up through row 119
    lowhop(9.8, 7.4, 4.0, 2.0, 0.4)                    # row 125
    jump_up("right")                                   # up through the y132 slab
    fez.walk(8.0, tol=0.2); jump_up()                  # and the y138 one
    if tap_to(24.5, 155.47) is None: return None       # the pyramid steps
    go.turn_to("Right"); tap_to(-25.5, 155.47, 20)
    fez.walk(-25.5, tol=0.15); jump_up(ms=900)          # the owl's head, y162
    fez.walk(-25.0, tol=0.15)
    fez.edge("up", True); fez.edge("space", True); time.sleep(1); fez.edge("space", False); time.sleep(4); fez.edge("up", False)
    return fez.state()


if __name__ == "__main__":
    s = ending(); print(s and (s["level"], s["pos"], s["action"]))

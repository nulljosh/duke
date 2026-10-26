"""NATURE_HUB: to the Waterfall door (found by hand 2026-10-26).
The door sits on a plank on the left tower's face (Back view, y15) that the planner keeps missing. Black holes
re-roll on every level load and can wall off the route: step through a door Gomez stands in and back until none
are on. The planner climbs to the tower top (Left 2,19) on its own; from there, hang off the tower's left edge
in the Back view and let go: the plank sticks out one unit past the edge and catches him."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go, trip


def wait_level(name, timeout=12):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = fez.state()
        if s["level"] == name and not s["loading"]: time.sleep(1.5); return fez.state()   # holes settle after the load
        time.sleep(0.3)
    return None


def reroll_holes(tries=6):
    s = fez.state(); home = s["level"]
    for _ in range(tries):
        if not any(h["on"] for h in s["holes"]): return s
        if s.get("door") is None: return None   # only works from inside a door volume
        fez.key("up", 150); time.sleep(2)
        other = fez.state()["level"]
        if other == home or wait_level(other) is None: return None
        fez.key("up", 150)
        s = wait_level(home)
        if s is None: return None
    return s


def to_waterfall():
    if go.go((2, 19), "Left") is None: return None
    s = go.turn_to("Back")
    if s["view"] != "Back": return None
    fez.walk(-28.4, tol=0.15)
    for _ in range(14):   # creep to the edge: a full walk runs straight off it
        s = fez.state()
        if "Teeter" in s["action"] or not s["grounded"]: break
        fez.key("left", 40); time.sleep(0.25)
    if not s["grounded"]: return None
    fez.edge("down", True); time.sleep(0.3); fez.edge("down", False); time.sleep(0.8)
    if not fez.state()["action"].startswith("Grab"): return None   # no hang: dropping now misses the plank
    fez.edge("down", True); time.sleep(0.1); fez.edge("down", False)
    s = go.landed()
    if abs(s["pos"][1] - 15.47) > 0.3: return None
    return trip.door("WATERFALL")


if __name__ == "__main__":
    s = reroll_holes() and to_waterfall(); print(s and (s["level"], s["pos"]))

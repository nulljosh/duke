"""ZU_CITY_RUINS: down from the warp gate (y54) to the door floor at y43 (found by hand 2026-10-26).
The planner reaches the y50 floor but the next floor is 7 below, past a safe drop. Hanging from the y50 floor's
right edge in the Front view (x53) first leaves about 5.5 to fall, which he survives."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def down():
    if go.go((50, 50), "Front") is None: return None
    go.turn_to("Front"); fez.walk(52.4, tol=0.2)
    for _ in range(14):   # creep to the edge: a full walk runs straight off it
        s = fez.state()
        if "Teeter" in s["action"] or not s["grounded"]: break
        fez.key("right", 40); time.sleep(0.25)
    if not s["grounded"]: return None
    fez.edge("down", True); time.sleep(0.3); fez.edge("down", False); time.sleep(0.8)
    if not fez.state()["action"].startswith("Grab"): return None
    fez.edge("down", True); time.sleep(0.15); fez.edge("down", False)
    s = go.landed()
    return s if abs(s["pos"][1] - 43.47) < 0.3 else None


def to_y28():
    """From the y36 slab down to the y28 floor (found by hand 2026-10-26), the way to Zu Bridge and the Observatory.
    The planner sees no way off the slab. In the Left view run off the slab's left end (z23.5), let go and press Down:
    he catches the corner of the x20 pillar. Up climbs onto it, and walking right off the pillar (it sits at another
    depth, so the slab doesn't catch him) falls about 8 to the y28 floor at z25, which he survives."""
    go.turn_to("Left"); fez.walk(24.5, tol=0.2)
    fez.edge("left", True); t = time.time()
    while fez.state()["grounded"] and time.time() - t < 3: time.sleep(0.02)
    fez.edge("left", False)
    fez.edge("down", True); time.sleep(0.3); fez.edge("down", False); time.sleep(0.6)
    if not fez.state()["action"].startswith("Grab"): return None
    fez.edge("up", True); time.sleep(0.3); fez.edge("up", False); time.sleep(1.2)
    fez.walk(24.6, tol=0.15)
    s = go.landed(timeout=8)
    return s if abs(s["pos"][1] - 28.47) < 0.3 else None


if __name__ == "__main__":
    s = down(); print(s and (s["level"], s["pos"]))

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


if __name__ == "__main__":
    s = down(); print(s and (s["level"], s["pos"]))

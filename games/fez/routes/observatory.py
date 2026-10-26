"""OBSERVATORY: the gold cube on the corner block at (5, 44, 6) (found by hand 2026-10-26, cube 31).
Come in at the top through the Throne door (Ruins > Zu Bridge > Throne > Observatory); from the bottom door the
timeswitch stairs are in the way. The block's corners are ledge art objects the planner doesn't see: from the y39
floor's left end in the Front view, a run-jump left catches the corner ledge, Up climbs on, a jump under the cube."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def cube():
    if go.go((13, 39), "Front") is None: return None
    s = fez.runjump(12.4, 8.0, jump_ms=450)
    if not s["action"].startswith("Grab"): return None
    fez.edge("up", True); time.sleep(0.3); fez.edge("up", False); time.sleep(1.2)
    fez.walk(5.6, tol=0.2)
    fez.edge("space", True); time.sleep(0.3); fez.edge("space", False); time.sleep(4)
    return fez.state()


if __name__ == "__main__":
    s = cube(); print(s and (s["level"], s["pos"], s["cubes"], s["anti"]))

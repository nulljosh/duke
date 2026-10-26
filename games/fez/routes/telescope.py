"""TELESCOPE: out to the Observatory door (found by hand 2026-10-26).
The level's floors sit at half heights (19.5, 23.5, 25.5), which the planner's integer grid cannot see, so it
plans nothing here. The door is a Right-view door at x22 to 25, z17.5 to 18.5 on the y20 floor: line up x in the
Front view, then z in the Right view, then Up.
The code's anti-cube spawns at (17.5, 35.5, 19.5) above the telescope (level state ANC keeps it there); the climb
to it is not found yet. A wall walkway runs round the room at y22.5 (pillar tops); the roof is at y26.5."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def out():
    go.turn_to("Front"); fez.walk(23.5, tol=0.2)
    go.turn_to("Right"); fez.walk(-18.0, tol=0.15)
    fez.key("up", 150); time.sleep(6)
    return fez.state()


if __name__ == "__main__":
    s = out(); print(s["level"], s["pos"])

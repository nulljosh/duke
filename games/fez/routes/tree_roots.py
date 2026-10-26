"""TREE_ROOTS: up from the Nature Hub door to the Tree door (found by hand 2026-10-26).
The Tree door sits on a ring of TopOnly planks around the trunk at y44 (x12 side, z13-16) and only opens from
the Left view with Gomez on that x12 plank. The planner reaches the vine top at Right -17,45 on its own; from there
hop onto the x17 plank, walk the z12 plank in the Back view to x12.5, then turn Left and walk to the door."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def up():
    s = go.go((-17, 45), "Right")
    if s is None: return None
    fez.hop(fez.h(fez.state()) + 1.2, jump_ms=300, lead=0.3)   # vine top onto the x17 plank
    go.turn_to("Back"); fez.walk(-12.5, tol=0.15)               # around the corner on the z12 plank
    go.turn_to("Left"); fez.walk(14.5, tol=0.15)
    fez.key("up", 150); time.sleep(6)
    return fez.state()


def down():
    """The way back: from the Tree door round the ring and drop-grab the vine (Back -18,42); the planner takes it from
    there. The plank ends short of the vine, so walking on in the Right view falls to the y35 floor and dies.
    Black holes sit over the vine top when they roll on: nature_hub.reroll_holes() from the door first."""
    go.turn_to("Back"); fez.walk(-16.6, tol=0.15)
    return go.go((-16, 42), "Right", tries=4)


if __name__ == "__main__":
    s = up(); print(s and (s["level"], s["pos"]))

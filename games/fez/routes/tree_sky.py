"""TREE_SKY: from the code platform down the trunk to the Tree door (found by hand 2026-10-26).
In the Front view: creep off the trunk top's left edge (x10.9, y46.5) with no Up held (holding Up kills him on
the vine) and land on the plank at y42 that sticks out a unit past the edge; walk to its right end (x14), hang
from it and let go: about 6.5 down onto the door plank at y35, under the Tree door (x14.5)."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def creep(d):
    for _ in range(20):
        s = fez.state()
        if "Teeter" in s["action"] or not s["grounded"]: return s
        fez.key(d, 40); time.sleep(0.25)
    return fez.state()


def to_tree():
    go.turn_to("Front"); fez.walk(11.3, tol=0.15); creep("left"); fez.key("left", 60)
    s = go.landed()
    if abs(s["pos"][1] - 41.97) > 0.3: return None
    fez.walk(13.5, tol=0.2); creep("right")
    fez.edge("down", True); time.sleep(0.3); fez.edge("down", False); time.sleep(0.8)
    if not fez.state()["action"].startswith("Grab"): return None
    fez.edge("down", True); time.sleep(0.12); fez.edge("down", False)
    s = go.landed()
    if abs(s["pos"][1] - 34.97) > 0.3: return None
    fez.walk(14.5, tol=0.12); fez.key("up", 150); time.sleep(6)
    return fez.state()


if __name__ == "__main__":
    s = to_tree(); print(s and (s["level"], s["pos"]))

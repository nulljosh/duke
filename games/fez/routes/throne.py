"""THRONE: down to the Tree Sky door (found by hand 2026-10-26).
The door is cut into the face of the crate block, over a y10 grass ledge that sits under the crate top's left
overhang. In the Left view: creep off the crate top's left end (z16, y15.5), hang, shimmy round to its back and
along to z18.6, let go onto the ledge (about 4.5 down), walk to z21.5 and press Up."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def to_tree_sky():
    go.turn_to("Left"); fez.walk(17.0, tol=0.3); time.sleep(0.6)
    for _ in range(16):   # creep: a full walk runs straight off the edge
        s = fez.state()
        if "Teeter" in s["action"] or not s["grounded"]: break
        fez.key("left", 40); time.sleep(0.25)
    fez.edge("down", True); time.sleep(0.3); fez.edge("down", False); time.sleep(0.8)
    if not fez.state()["action"].startswith("Grab"): return None
    fez.key("right", 300); time.sleep(0.9)   # round the corner onto the ledge's back face
    fez.edge("right", True)
    for _ in range(80):
        time.sleep(0.05); s = fez.state()
        if s["pos"][2] >= 18.6 or not s["action"].startswith(("Grab", "Shimmy", "FromCorner")): break
    fez.edge("right", False); time.sleep(0.2)
    fez.edge("down", True); time.sleep(0.1); fez.key("space", 60); time.sleep(0.05); fez.edge("down", False)
    s = go.landed()
    if abs(s["pos"][1] - 10.47) > 0.3: return None
    fez.walk(21.5, tol=0.15); fez.key("up", 150); time.sleep(6)
    return fez.state()


if __name__ == "__main__":
    s = to_tree_sky(); print(s and (s["level"], s["pos"]))

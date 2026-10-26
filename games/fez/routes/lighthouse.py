"""LIGHTHOUSE: the code anti-cube on the obelisk (46, 22.5, 9), found by hand 2026-10-26.
Only the obelisk's top trile collides (TopOnly, top y23.5), three up from the slab: a running jump from x43.9 in
the Front view peaks right at its corner and Gomez grabs the ledge; Up pulls him on top, onto the cube."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def obelisk():
    go.go((45, 20), "Front"); go.turn_to("Front"); fez.walk(43.9, tol=0.1)
    fez.edge("right", True); time.sleep(0.05); fez.edge("space", True); t0 = time.time()
    while time.time() - t0 < 1.4:
        s = fez.state()
        if time.time() - t0 > 0.45: fez.edge("space", False)
        if s["action"].startswith("Grab") or (time.time() - t0 > 0.3 and s["grounded"]): break
        time.sleep(0.02)
    fez.edge("right", False); fez.edge("space", False)
    fez.key("up", 150); time.sleep(1.5)
    return fez.state()


if __name__ == "__main__":
    s = obelisk(); print(s["pos"], s["anti"])

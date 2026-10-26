"""TREE: from the y77 ledge (Front x8-9, below the y85 ledge) down four mushrooms to the y58 floor (found 2026-10-26).
Gomez keeps his sideways speed in the air (drag is tiny), so a bounce is steered by prediction: project where he'll be
when he falls back through the target height, and hold left, right or nothing to put that point on the mushroom's
centre. Mushrooms (Bounce triles): y72 x4-6 z34-36, y68 x0-2 z24-26, y64 x11-13 z27-29, y58 x13-15 z36-38.
From the y85 ledge, go.go((-35, 73), 'Right') gets him onto the y77 ledge (drop-grab the vine, climb down)."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go

aim = go.aim


def down():
    """Run from the y77 ledge, Front view. Black holes between y64 and y75 re-roll per load: go while they're off."""
    aim(5.6, 73.5); aim(1.5, 69.5)            # y72 mushroom, then y68
    fez.key("d", 100); time.sleep(0.4)       # Front -> Right mid-bounce
    aim(-28.5, 65.5)                          # y64 mushroom
    fez.key("d", 100); time.sleep(0.4)       # Right -> Back
    aim(-14.5, 59.5); aim(-17.6, 58.5)       # y58 mushroom, then the y58 floor
    time.sleep(1.5); return fez.state()


def to_roots_door():
    """From the y58 floor to the Tree Roots door (Front x21, y53). The door sits in a notch under the y57 slab, so
    the planner's dropbacks never leave the slab: hang off the slab's left end (x17) in the Front view and steer
    right as he falls; he catches the notch's corner ledge and pulls up."""
    if go.go((18, 58), "Front") is None: return None
    go.turn_to("Front"); fez.walk(17.5, tol=0.15)
    for _ in range(16):   # creep: a full walk runs straight off the edge
        s = fez.state()
        if "Teeter" in s["action"] or not s["grounded"]: break
        fez.key("left", 40); time.sleep(0.25)
    fez.edge("down", True); time.sleep(0.3); fez.edge("down", False); time.sleep(0.8)
    if not fez.state()["action"].startswith("Grab"): return None
    fez.edge("down", True); time.sleep(0.12); fez.edge("down", False); time.sleep(0.12)
    fez.edge("right", True); t0 = time.time()
    while time.time() - t0 < 2:
        s = fez.state()
        if s["pos"][0] > 18.2: fez.edge("right", False)
        if s["grounded"] or s["action"].startswith(("Grab", "Dying")): break
        time.sleep(0.02)
    fez.edge("right", False)
    go.settle(go.landed()); return fez.walk(21.5, tol=0.15)


if __name__ == "__main__":
    s = down(); print(s["level"], s["pos"], s["action"])

"""ZU_CODE_LOOP: the code anti-cube at (4.5, 42, 4.5) (found by hand 2026-10-26).
The level loops vertically (LevelLooper), but only while Gomez is Falling, not FreeFalling. From the grassy
ledge at y4.5 (Back view), creep off its left end at x4.1, push left to x5 and let go: he crosses y0 still
Falling, wraps to y45 and drops straight through the cube."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def wrap_to_cube(stop=-5.1):
    go.turn_to("Back"); fez.walk(-3.6, tol=0.1)
    for _ in range(14):
        s = fez.state()
        if "Teeter" in s["action"] or not s["grounded"]: break
        fez.key("left", 40); time.sleep(0.25)
    for _ in range(8):
        fez.key("left", 30); time.sleep(0.15)
        if not fez.state()["grounded"]: break
    fez.edge("left", True); held = True; t0 = time.time()
    while time.time() - t0 < 5:
        s = fez.state()
        if held and fez.h(s) <= stop: fez.edge("left", False); held = False
        if (time.time() - t0 > 0.8 and s["grounded"]) or s["action"] == "Dying": break
        time.sleep(0.02)
    if held: fez.edge("left", False)
    return fez.state()

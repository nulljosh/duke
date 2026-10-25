"""ZU_LIBRARY: from the library door down to the Clock Tower door (Right view, under the building).
Learned 2026-10-25 by playing: the left side is walled, so the way down is the right edge, a front-view
drop onto the floating block, and a right-view hop to the pillar beside the door platform."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez


def to_middle_ledge():
    fez.walk(-13.5); fez.walk(-13.1)                       # off the right edge onto the second ledge
    fez.key("a", 100); time.sleep(1.3)                      # Front view
    fez.walk(39.9); fez.drop("right", "left")               # onto the upper floating block
    s = fez.drop("left", "left")                            # onto the middle ledge (often a ledge grab)
    if s["action"].startswith("Grab"): fez.key("up", 150); time.sleep(1.2)
    fez.key("d", 100); time.sleep(1.3)                      # back to Right view


def to_pillar():
    fez.walk(-20.5); fez.drop("right", "left"); time.sleep(0.4)   # onto the lower floating block
    s = fez.hop(-19.9)
    if s["action"].startswith("Grab"): fez.key("up", 150); time.sleep(1.3)
    return fez.state()


def to_clock():
    """Pillar to door platform needs the full-height jump: hold Space 0.5 s and the direction all the way."""
    fez.edge("left", True); time.sleep(0.04); fez.edge("space", True); t0 = time.time()
    while time.time() - t0 < 2.5:
        s = fez.state()
        if time.time() - t0 > 0.5: fez.edge("space", False)
        if time.time() - t0 > 0.3 and (s["grounded"] or s["action"].startswith("Grab")): break
        time.sleep(0.02)
    fez.edge("left", False); fez.edge("space", False); time.sleep(0.4)
    fez.walk(-27.5); fez.key("up", 150); time.sleep(6)
    return fez.state()


if __name__ == "__main__":
    to_middle_ledge(); to_pillar(); print(to_clock())

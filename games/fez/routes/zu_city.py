"""ZU_CITY: down from the y36 floor to the Memory Core door at y28 (found by hand 2026-10-26).
The planner's camera turns here land Gomez off-plan, so this is done by hand in the Left view: inch to the
floor's left end, hang from it, shimmy back under it along the ledge, drop onto the pillar at z20, hop the
second pillar and drop onto the y28 floor. Restarting FEZ in Zu City puts Gomez on the y36 floor."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go, trip


def down():
    go.turn_to("Left"); fez.walk(19.5, tol=0.3)
    for _ in range(12):   # creep to the edge: a full walk runs straight off it
        s = fez.state()
        if "Teeter" in s["action"] or s["pos"][2] < 18.95: break
        fez.key("left", 40); time.sleep(0.25)
    fez.edge("down", True); time.sleep(0.3); fez.edge("down", False); time.sleep(0.8)   # hang
    fez.key("right", 300); time.sleep(0.9)                                              # round to the ledge's back
    fez.edge("right", True)
    for _ in range(60):
        time.sleep(0.05)
        if fez.state()["pos"][2] >= 20.5: break
    fez.edge("right", False); time.sleep(0.2)
    fez.edge("down", True); time.sleep(0.1); fez.key("space", 60); time.sleep(0.05); fez.edge("down", False)
    time.sleep(1.5)
    fez.hop(23.4); fez.hop(26.8)   # second pillar, then the y28 floor
    return trip.door("MEMORY_CORE")


if __name__ == "__main__":
    s = down(); print(s and (s["level"], s["pos"]))

"""CLOCK: from the Zu Library door down the purple block staircase to the Zu City Ruins door (Back view).
Blocks (AllSides, from the level file): x34 top y21, x31 top y17, x34 top y14, then the door ledge x37-40 top y14.
A jump before a drop adds enough fall height to kill Gomez here, so the lower steps are walked off."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez


def step_off(d, stop_at, sign):
    fez.edge(d, True); t0 = time.time()
    while time.time() - t0 < 2.5:
        s = fez.state()
        if (s["pos"][0] - stop_at) * sign >= 0: fez.edge(d, False)
        if time.time() - t0 > 0.3 and (s["grounded"] or s["action"].startswith(("Grab", "Dying"))): break
        time.sleep(0.03)
    fez.edge(d, False); time.sleep(0.4)
    s = fez.state()
    if s["action"].startswith("Grab"): fez.key("up", 150); time.sleep(1.3)
    return fez.state()


def down_to_b3():
    if fez.state()["view"] != "Back": fez.key("d", 150); time.sleep(1.5)
    fez.walk(-39.3); s = fez.hop(-34.5, jump_ms=450)
    if s["action"].startswith("Grab"): fez.key("up", 150); time.sleep(1.3)
    s = fez.hop(-31.5, jump_ms=200)
    if s["action"].startswith("Grab"): fez.key("up", 150); time.sleep(1.3)
    return step_off("left", 34.3, 1)


def to_ruins():
    s = down_to_b3()
    fez.edge("left", True); time.sleep(0.03); fez.edge("space", True); t0 = time.time()   # small hop over the 2-unit gap
    while time.time() - t0 < 2:
        s = fez.state()
        if time.time() - t0 > 0.12: fez.edge("space", False)
        if s["pos"][0] >= 37.2: fez.edge("left", False)
        if time.time() - t0 > 0.3 and (s["grounded"] or s["action"].startswith(("Grab", "Dying"))): break
        time.sleep(0.03)
    fez.edge("left", False); fez.edge("space", False); time.sleep(0.4)
    fez.walk(-39.5); fez.key("up", 150); time.sleep(6)
    return fez.state()

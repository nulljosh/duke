"""BIG_TOWER: up the tower to the Memory Core door (found by hand 2026-10-26, New Game+).
The planner gets to the Front y50 step. Above it the steps spiral round the tower and bob up and down, so each hop is
done from the step's edge and retried until the bobbing step is in reach: Front 19-20 > 23-24 > 27-28 > 32-33 > 36-37,
the Left step at z9-10, then a jump at the top of the last bob catches the y63 platform's ledge. Any miss drops Gomez
a few steps; every attempt starts again from the y50 step."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def stair(edge_h, release_h, view=None, peak=False):
    if view: go.turn_to(view)
    fez.walk(edge_h, tol=0.15)
    if peak:   # wait for the top of the bob: its own height is the only clock
        ys = []; t0 = time.time()
        while time.time() - t0 < 5: ys.append(fez.state()["pos"][1]); time.sleep(0.03)
        t0 = time.time()
        while time.time() - t0 < 8 and fez.state()["pos"][1] < max(ys) - 0.1: time.sleep(0.01)
    sign = 1 if release_h > edge_h else -1; d = "right" if sign > 0 else "left"
    fez.edge(d, True); fez.edge("space", True); t0 = time.time(); grab = False
    while time.time() - t0 < 3:
        s = fez.state()
        if time.time() - t0 > 0.45: fez.edge("space", False)
        if not peak and (fez.h(s) - release_h) * sign >= 0: fez.edge(d, False)
        if s["action"].startswith("Grab"): grab = True; break
        if time.time() - t0 > 0.4 and s["grounded"]: break
        time.sleep(0.02)
    for k in ("left", "right", "space"): fez.edge(k, False)
    if grab: fez.key("up", 300); time.sleep(1.2)
    time.sleep(0.5); return fez.state()


def retry(edge_h, release_h, ok, view=None, tries=6):
    for _ in range(tries):
        s = stair(edge_h, release_h, view)
        if ok(s): return s
        if s["pos"][1] < 54: return None   # fell off the spiral
        time.sleep(1.3)
    return None


def attempt():
    go.turn_to("Front")
    for _ in range(4): fez.walk(20.0, tol=0.3); time.sleep(0.8)   # down to the y50 step
    if abs(fez.state()["pos"][1] - 50.47) > 0.3: return None
    for e, r in [(20.6, 23.3), (24.6, 27.3)]:
        y0 = fez.state()["pos"][1]
        if stair(e, r, "Front")["pos"][1] <= y0 + 0.3: return None
    if retry(28.15, 32.3, lambda s: s["pos"][1] > 54.9 and s["pos"][0] > 31) is None: return None   # x28.5 touches the recess wall
    if retry(33.6, 36.3, lambda s: s["pos"][0] > 35.5 and s["pos"][1] > 55.5) is None: return None
    time.sleep(0.5)
    if retry(6.8, 9.3, lambda s: s["pos"][1] > 57.5 and abs(s["pos"][0] - 13.5) < 1, "Left") is None: return None
    s = stair(14.6, 99, "Front", peak=True)   # hold right all the way: the ledge catch needs it
    return s if s["pos"][1] > 62.5 else None


def up(tries=25):
    if fez.state()["pos"][1] < 49.5 and go.go((20, 50), "Front", tries=10) is None: return None
    for _ in range(tries):
        if fez.state()["level"] != "BIG_TOWER": return fez.state()
        s = attempt()
        if s: break
        time.sleep(3)
    else: return None
    import trip
    return trip.door("MEMORY_CORE")


if __name__ == "__main__":
    s = up(); print(s and (s["level"], s["pos"]))

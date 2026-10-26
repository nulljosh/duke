"""TREE: from the y77 ledge (Front x8-9, below the y85 ledge) down four mushrooms to the y58 floor (found 2026-10-26).
Gomez keeps his sideways speed in the air (drag is tiny), so a bounce is steered by prediction: project where he'll be
when he falls back through the target height, and hold left, right or nothing to put that point on the mushroom's
centre. Mushrooms (Bounce triles): y72 x4-6 z34-36, y68 x0-2 z24-26, y64 x11-13 z27-29, y58 x13-15 z36-38.
From the y85 ledge, go.go((-35, 73), 'Right') gets him onto the y77 ledge (drop-grab the vine, climb down)."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez

K, G, TERM = 73.0, 0.58, -0.408   # position units/s per velocity unit; dvy/dt; terminal vy (measured in TREE)


def eta(y, vy, ty):
    """Seconds until the fall crosses height ty, or None if it never comes back down to it."""
    t = 0.0
    while t < 4:
        t += 0.01; vy = max(TERM, vy - G * 0.01); y += K * vy * 0.01
        if vy < 0 and y <= ty: return t
    return None


def aim(tx, ty, timeout=6, tol=0.25):
    """Keep the projected crossing of height ty at screen column tx; stop at the next bounce or landing."""
    t0 = time.time(); held = None; fell = False
    while time.time() - t0 < timeout:
        s = fez.state(); i, sign = fez.AXIS[s["view"]]
        vx, vy = s["vel"][i] * sign, s["vel"][1]
        t = eta(s["pos"][1], vy, ty)
        px = fez.h(s) + K * vx * t if t else fez.h(s)
        want = None if t is None or abs(px - tx) < tol else ("left" if px > tx else "right")
        if want != held:
            if held: fez.edge(held, False)
            if want: fez.edge(want, True)
            held = want
        if vy < -0.02: fell = True
        if fell and (s["grounded"] or vy > 0.05 or s["action"].startswith(("Grab", "Dying"))): break
        time.sleep(0.02)
    if held: fez.edge(held, False)
    return fez.state()


def down():
    """Run from the y77 ledge, Front view. Black holes between y64 and y75 re-roll per load: go while they're off."""
    aim(5.6, 73.5); aim(1.5, 69.5)            # y72 mushroom, then y68
    fez.key("d", 100); time.sleep(0.4)       # Front -> Right mid-bounce
    aim(-28.5, 65.5)                          # y64 mushroom
    fez.key("d", 100); time.sleep(0.4)       # Right -> Back
    aim(-14.5, 59.5); aim(-17.6, 58.5)       # y58 mushroom, then the y58 floor
    time.sleep(1.5); return fez.state()


if __name__ == "__main__":
    s = down(); print(s["level"], s["pos"], s["action"])

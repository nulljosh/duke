"""Check the plan against the map before unpausing a new colony: every pitcher pump must have both its columns open to
liquid below (PumpingStationGuide.GetDepthAvailable: 2 columns, up to 4 cells, stops at the first solid). python3 preflight.py"""
import sys
import oni
from play import PLAN, liquid

assert liquid(['X: Liquid Available: \n<link="WATER">Water</link>: 5.3 t']) == 5300 and liquid(['<link="WATER">Water</link>: 800 kg']) == 800 and liquid(["Empty"]) == 0


def depth(x, y, solid):
    d = 0
    for i in range(1, 5):
        if solid(x, y - i) or solid(x + 1, y - i): break
        d = i
    return d


def main():
    g = oni.cmd(op="grid", x0=150, y0=90, x1=230, y1=140)
    kind = {k: v.split()[-1] for k, v in g["legend"].items()}
    at = lambda x, y: kind.get(g["rows"][140 - y][x - 150], "building") if 150 <= x <= 230 and 90 <= y <= 140 else "solid"
    ok = True
    for name, x, y, _ in PLAN:
        if name != "LiquidPumpingStation": continue
        d = depth(x, y, lambda cx, cy: at(cx, cy) in ("solid", "building"))   # another building in a column blocks it too
        wet = sum(at(cx, y - i) == "liquid" for i in range(1, d + 1) for cx in (x, x + 1))
        good = d > 0 and wet > 0
        ok &= good
        print("PASS" if good else "FAIL", f"pump {x},{y}: depth {d}, {wet} liquid cells under it")
    step = at(188, 109) == "solid" and all(at(*c) != "liquid" for c in ((187, 110), (189, 110), (188, 111), (187, 111), (189, 111), (188, 112)))
    ok &= step
    print("PASS" if step else "FAIL", "the step at 188,110: a floor under it, no liquid beside it")   # play.py digs it with plain dig
    return ok


if __name__ == "__main__":
    sys.exit(0 if main() else 1)

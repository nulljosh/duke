"""The run, one leg at a time. Each leg is plain code on top of nav (walking, warps, talk, heal) and logs a row.
python3 play.py <leg>"""
import sys

import graph
import mons
import nav
import pk
import stats


def lead(g):
    return mons.party(g)[0]


def grind(g, level, back):
    """Pace a grass patch on this map until the lead reaches `level`. Returns early, and runs `back`,
    when HP drops under 40%, so the caller heals."""
    m = nav.Map(g)
    here = nav.where(g)[:2]
    patch = sorted(m.grass(), key=lambda p: abs(p[0] - here[0]) + abs(p[1] - here[1]))
    a = patch[0]
    b = next((p for p in patch if abs(p[0] - a[0]) + abs(p[1] - a[1]) == 1), patch[1])
    while lead(g)["level"] < level:
        for p in (a, b):
            nav.walk(g, p)
            if "Battle" in g.screen():
                nav.fight(g)
            x = lead(g)
            if x["hp"] * 10 < x["maxhp"] * 4:
                back(g)
                return False
    return True


def oldale_heal(g):
    """From Route 101 or 103 or Oldale itself: into the Oldale Pokemon Center and heal."""
    sec = g.r8(0x0202E828 + 0x14)
    if sec == 16:      # Route 101
        nav.edge(g, "UP")
    elif sec == 18:    # Route 103
        nav.edge(g, "DOWN")
    nav.warp(g, (6, 16))
    nav.heal(g)
    nav.warp(g, (7, 8))


def leg_grind101(g, level=8):
    while True:
        if g.r8(0x0202E828 + 0x14) != 16:
            nav.edge(g, "DOWN")
        if grind(g, level, oldale_heal):
            break
    x = lead(g)
    stats.log(g, f"Treecko trained to L{x['level']} on Route 101")
    graph.draw(graph.HERE / "progress.png")



def leg_may(g):
    """Heal in Oldale, then Route 103: talk to May, battle her Torchic."""
    oldale_heal(g)
    nav.edge(g, "UP")
    may = next(t for t in nav.templates(g) if t[1] == 240)   # graphicsId 240 is May on these maps
    _, _, x, y, _ = may
    for side in ("DOWN", "LEFT", "RIGHT", "UP"):
        if nav.use(g, (x, y), side):
            break
    nav.talk(g)
    if "Battle" in g.screen():
        nav.fight(g)
    stats.log(g, "Beat May's Torchic on Route 103")
    graph.draw(graph.HERE / "progress.png")


if __name__ == "__main__":
    g = pk.GBA()
    globals()["leg_" + sys.argv[1]](g, *map(int, sys.argv[2:]))
    print(stats.snapshot(g))

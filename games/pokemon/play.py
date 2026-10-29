"""The run, one leg at a time. Each leg is plain code on top of nav (walking, warps, talk, heal) and logs a row.
python3 play.py <leg>"""
import sys

import graph
import mons
import nav
import pk
import stats
import world


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


def leg_dex(g):
    """Back to Birch's lab after May: Pokedex from Birch, Poke Balls from May."""
    for _ in range(3):
        nav.edge(g, "DOWN")
    nav.warp(g, (7, 16))
    nav.talk(g)
    birch = next((t for t in nav.templates(g) if "Birch" in t[4]), None)
    if birch:
        nav.use(g, birch[2:4], "DOWN")
        nav.talk(g)
    stats.log(g, "Got the Pokedex from Birch")


def leg_petalburg(g):
    """Littleroot to Petalburg: Routes 101 and 102, trainers on the way, then Dad's gym and Wally."""
    for side in ("UP", "UP", "LEFT", "LEFT"):
        print(side, nav.edge(g, side), nav.where(g), flush=True)
    gym = next(p for p, dest in nav.warps(g).items() if dest[:2] == (8, 1)) if any(d[:2] == (8, 1) for d in nav.warps(g).values()) else None
    print("warps", nav.warps(g), flush=True)
    stats.log(g, "Reached Petalburg City")


def here(g):
    return nav.where(g)[2:]


def hp_low(g, frac=0.5):
    return any(m["hp"] < m["maxhp"] * frac for m in mons.party(g)[:1])


def route_from_here(g, goal, banned=()):
    x, y, grp, num = nav.where(g)
    return world.route(g, (grp, num), (x, y), goal, banned)


def heal_nearest(g):
    centers = [world.find(n) for n in world.NAMES.values() if n.endswith("PokemonCenter_1F")]
    routes = [r for r in (route_from_here(g, c) for c in centers) if r is not None]
    if routes:
        goto(g, world.name(min(routes, key=len)[-1][3]), heal=False)
    nav.heal(g)
    print("healed at", world.name(here(g)), flush=True)


def hop(g, h):
    kind, tile, side, dest, arrive = h
    if kind == "warp":
        return nav.warp(g, tile)
    m = here(g)
    if not nav.walk(g, tile):
        return here(g) != m
    for _ in range(3):
        nav.step(g, side)
        if nav.changed(g, m, 40):
            return True
    return False


def goto(g, name, heal=True):
    """Walk to the named map hop by hop; a hop that fails is banned and the route replanned."""
    goal, banned = world.find(name), set()
    for _ in range(80):
        if here(g) == goal:
            return True
        if heal and hp_low(g):
            heal_nearest(g)
            continue
        r = route_from_here(g, goal, banned)
        if not r:
            print("no route to", name, "banned", banned, flush=True)
            return False
        start, h = here(g), r[0]
        ok = hop(g, h)
        print(h[0], h[1], h[2], "->", world.name(here(g)), ok, flush=True)
        if here(g) == start:
            banned.add((start, h[1], h[2]))
    return here(g) == goal


def leg_goto(g, *name):
    goto(g, " ".join(name))


def leg_norman(g):
    """Petalburg Gym: meet Dad, then walk Wally to Route 102 for his Ralts and back."""
    goto(g, "PetalburgCity_Gym")
    nav.talk(g)
    for t in nav.templates(g):
        print("gym", t, flush=True)
    stats.log(g, "Met Dad at the Petalburg Gym")


def leg_roxanne(g, level=17):
    """Grind on Route 104's north grass, heal, then beat Roxanne in the Rustboro Gym."""
    while lead(g)["level"] < level:
        goto(g, "Route104")
        grind(g, level, heal_nearest)
    if lead(g)["hp"] < lead(g)["maxhp"]:
        heal_nearest(g)
    goto(g, "RustboroCity_Gym")
    rox = min(nav.templates(g), key=lambda t: t[3])     # the leader stands at the top of the gym
    print("roxanne", rox, flush=True)
    nav.use(g, rox[2:4], "DOWN")
    nav.talk(g)
    if "Battle" in g.screen():
        nav.fight(g)
    nav.talk(g)
    row = stats.log(g, "Beat Roxanne: Stone Badge")
    print(row, flush=True)


def leg_tunnel(g):
    """Rustboro after the badge: chase the Aqua grunt who stole the Devon Goods into Rusturf Tunnel."""
    if here(g) == world.find("RustboroCity_Gym"):
        goto(g, "RustboroCity")
    nav.talk(g)
    goto(g, "RusturfTunnel")
    for t in nav.templates(g):
        print("tunnel", t, flush=True)
    grunt = next((t for t in nav.templates(g) if "Grunt" in t[4] or "Aqua" in t[4]), None)
    if grunt:
        for side in ("LEFT", "RIGHT", "DOWN", "UP"):
            if nav.use(g, grunt[2:4], side):
                break
        nav.talk(g)
        if "Battle" in g.screen():
            nav.fight(g)
        nav.talk(g)
    stats.log(g, "Got the Devon Goods back in Rusturf Tunnel")


if __name__ == "__main__":
    g = pk.GBA()
    globals()["leg_" + sys.argv[1]](g, *[int(a) if a.isdigit() else a for a in sys.argv[2:]])
    print(stats.snapshot(g))

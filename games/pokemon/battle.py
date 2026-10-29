"""Battles, read from pokeruby: gBattleMons (0x58 bytes each, include/pokemon.h), the move table gBattleMoves and
the type chart gTypeEffectiveness in ROM, and the player controller's input handlers to know when a menu waits."""
import pk

MONS, FUNCS = 0x02024A80, 0x03004330          # gBattleMons, gBattlerControllerFuncs
ACTION_CUR, MOVE_CUR = 0x02024E60, 0x02024E64 # gActionSelectionCursor, gMoveSelectionCursor (per battler)
MOVES, CHART = 0x081FB0D4, 0x081F96C8         # gBattleMoves (12 bytes each), gTypeEffectiveness
TYPE_FLAGS = 0x020239F8                       # gBattleTypeFlags
_chart = None


def u16(b, i):
    return int.from_bytes(b[i:i + 2], "little")


def mon(g, i):
    b = g.read(MONS + i * 0x58, 0x58)
    return dict(species=u16(b, 0), moves=[u16(b, 0x0C + j * 2) for j in range(4)], types=(b[0x21], b[0x22]),
                pp=list(b[0x24:0x28]), hp=u16(b, 0x28), level=b[0x2A], maxhp=u16(b, 0x2C))


def chart(g):
    """(attacking type, defending type) -> multiplier x10; the table ends at 0xFF, 0xFE marks the Foresight split."""
    global _chart
    if _chart is None:
        raw, _chart = g.read(CHART, 336 * 3), {}
        for i in range(0, len(raw), 3):
            a, d, m = raw[i:i + 3]
            if a == 0xFF:
                break
            if a != 0xFE:
                _chart[(a, d)] = m
    return _chart


def move(g, mid):
    b = g.read(MOVES + mid * 12, 12)
    return dict(effect=b[0], power=b[1], type=b[2], accuracy=b[3] or 100)


def score(g, me, foe, slot):
    mid = me["moves"][slot]
    if not mid or not me["pp"][slot]:
        return -1
    m = move(g, mid)
    if not m["power"]:
        return 0                                   # status moves only when nothing hits
    mult = 1.0
    for t in set(foe["types"]):
        mult *= chart(g).get((m["type"], t), 10) / 10
    stab = 1.5 if m["type"] in me["types"] else 1.0
    return m["power"] * mult * stab * m["accuracy"] / 100


def grid_to(g, cur_addr, want):
    """Both battle menus are 2x2: 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right."""
    cur = g.r8(cur_addr)
    if cur % 2 != want % 2:
        g.press("RIGHT" if want % 2 else "LEFT", after=6)
    if cur // 2 != want // 2:
        g.press("DOWN" if want // 2 else "UP", after=6)


def best(g):
    me, foe = mon(g, 0), mon(g, 1)
    scores = [score(g, me, foe, s) for s in range(4)]
    return max(range(4), key=lambda s: scores[s]), scores


def fight(g, log=print):
    """Run one battle to the end. Returns the number of turns chosen."""
    turns = 0
    for _ in range(3000):
        scr = g.screen()
        if "Battle" not in scr:
            break
        f = pk.name(g.r32(FUNCS))
        if f == "HandleInputChooseAction":
            grid_to(g, ACTION_CUR, 0)               # FIGHT
            g.press("A", after=10)
        elif f == "HandleInputChooseMove":
            s, scores = best(g)
            grid_to(g, MOVE_CUR, s)
            g.press("A", after=20)
            turns += 1
            if turns == 1 or turns % 5 == 0:
                foe = mon(g, 1)
                log(f"  turn {turns}: move {s} {scores} vs species {foe['species']} L{foe['level']} {foe['hp']}/{foe['maxhp']}")
        else:
            g.press("A", after=12)                  # messages, level ups, exp
    return turns

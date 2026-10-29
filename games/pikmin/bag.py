"""Day 1: crush the paper bag at (-878, 2900) with both captains. Louie brings the Onion crew to the north side,
Olimar throws his five from the south. The game's hint: "change leaders and combine your wits and strengths"."""
import math
import time

import pk2

BAG = (-878, 2900)
pad = pk2.Pad()


def crew(near, r=400):
    return [q for q in pk2.pikis() if math.hypot(q[0] - near[0], q[1] - near[1]) < r]


def round_up(i):
    """Whistle the captain's loose Pikmin until the squad stops growing."""
    pk2.ACTIVE = i
    pk2.Walker.yaw = None
    home = pk2.pos()
    for _ in range(8):
        me, ps = pk2.pos(), crew(home, 700)
        if not ps or pk2.squad(i) >= len(ps):
            break
        far = max(ps, key=lambda q: math.hypot(q[0] - me[0], q[1] - me[1]))   # the squad follows me, stragglers don't
        pk2.whistle_at(pad, *far, ms=1500)
    print("captain", i, "squad", pk2.squad(i), flush=True)


def onto_bag(i):
    pk2.ACTIVE = i
    print("travel", pk2.travel(pad, *BAG, near=120), [round(v) for v in pk2.pos()], flush=True)
    print("throw miss", round(pk2.throw_at(pad, *BAG, n=pk2.squad(i))), flush=True)


round_up(1)
onto_bag(1)
pad.press("Y", 100, after=2.5)            # swap to Olimar
round_up(0)
onto_bag(0)
time.sleep(5)
left = [e for e in pk2.enemies() if e["id"] == 91 and math.hypot(e["x"] - BAG[0], e["z"] - BAG[1]) < 30]
print("bag", "still there" if left else "crushed", pk2.shot("bag2"), flush=True)

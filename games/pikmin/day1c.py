"""Day 1 has no sun meter: it ends when the Courage Reactor reaches the ship. Olimar plucks every sprout and brings
the Onion's Pikmin, then both captains throw their squads on the reactor (20 needed)."""
import time

import pk2

R, ONION = (-1069, 3292), (-340, 4000)
pad = pk2.Pad()
pk2.ACTIVE = 0
print("to onion", pk2.travel(pad, *ONION, near=120), flush=True)
for _ in range(3):                      # sprouts can need a moment before they pluck
    pk2.NOPLUCK.clear()
    pk2.pluck(pad)
    if not pk2.sprouts():
        break
    time.sleep(3)
for _ in range(2):
    pk2.whistle_at(pad, *ONION, ms=2500)
print("olimar squad", pk2.squad(0), "sprouts left", len(pk2.sprouts()), flush=True)
print("to reactor", pk2.travel(pad, *R, near=110), flush=True)
print("miss", round(pk2.throw_at(pad, *R, n=pk2.squad(0))), flush=True)
pad.press("Y", 100, after=2.5)          # Louie's six
pk2.ACTIVE = 1
print("miss", round(pk2.throw_at(pad, *R, n=pk2.squad(1))), flush=True)
for _ in range(100):
    time.sleep(3)
    if not [p for p in pk2.pellets() if p["i"] == 2]:
        print("delivered", flush=True)
        break
else:
    print("not moving", pk2.squad(0), pk2.squad(1), flush=True)
print(pk2.shot("day1c"), flush=True)

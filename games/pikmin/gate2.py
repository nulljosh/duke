"""Back to the Onion for the crew that carried the Red Bulborb home, then all of them onto the white gate."""
import time

import pk2

GATE = (-591, 1427)
ONION = (-230, 2792)
pad = pk2.Pad()
pk2.travel(pad, *ONION, near=80)
for _ in range(3):                             # seeds from the Bulborbs: pluck them all before the trip
    if not pk2.sprouts():
        break
    print("plucked", pk2.pluck(pad), "left", len(pk2.sprouts()), flush=True)
    pk2.NOPLUCK.clear()
for _ in range(4):
    if pk2.squad(0) >= pk2.alive() - 2:
        break
    pk2.gather(pad)
print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)
PATH = [(-700, 2800), (-900, 2700), (-1150, 2455), (-1160, 2230), (-1172, 1737), (-974, 1722)]   # ponytail: the
for x, z in PATH:                              # route graph's short way south is a snow wall, so walk the known one
    print("wp", x, z, pk2.goto(pad, x, z, near=45), flush=True)
pk2.travel(pad, *GATE, near=120)
t0 = time.time()
while GATE in [(round(x), round(z)) for x, z in pk2.items("gate")] and time.time() - t0 < 300:
    if pk2.squad(0):
        print("gate throw", pk2.squad(0), round(pk2.throw_at(pad, *GATE, n=pk2.squad(0))), flush=True)
    time.sleep(5)
print("gate", "down" if time.time() - t0 < 300 else "still up", pk2.shot("gate"), flush=True)

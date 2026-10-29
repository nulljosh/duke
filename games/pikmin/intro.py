"""Title to the first day: START, BEGIN, File 1, then A through the opening until the first Pikmin shows up."""
import time

import pk2

pad = pk2.Pad()
time.sleep(5)
for k in ("START", "A", "A", "A"):
    pad.press(k, after=4)
for i in range(400):
    pad.press("A", after=2)
    v = pk2.mem()
    if any(v.get(c) for c in ("red", "blue", "yellow")):
        print("pikmin at", i, v, flush=True)
        break
    if i % 30 == 0:
        print(i, {k: v.get(k) for k in ("pokos", "treasures", "red", "story")}, flush=True)
print(pk2.shot("day1"))

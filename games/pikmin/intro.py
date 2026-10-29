"""Title to the first day: START, BEGIN, File 1, then A through the opening until Olimar stands at the Day 1 landing spot
(so the A/START mash never reaches the pause menu's End Day)."""
import time

import pk2

pad = pk2.Pad()
time.sleep(5)
for k in ("START", "A", "A", "A"):
    pad.press(k, after=4)
for i in range(400):
    pad.press("START" if i % 2 else "A", after=2)          # START skips a cutscene once it is skippable
    v = pk2.mem()
    near = abs(v.get("olimar_x", 0) + 554) < 300 and abs(v.get("olimar_z", 0) - 2846) < 300   # Day 1 landing spot
    if near or any(v.get(c) for c in ("red", "blue", "yellow")):
        print("pikmin at", i, v, flush=True)
        break
    if i % 30 == 0:
        print(i, {k: v.get(k) for k in ("pokos", "treasures", "red", "story")}, flush=True)
print(pk2.shot("day1"))

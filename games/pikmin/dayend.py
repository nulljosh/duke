"""Wait for sunset with everyone in the squad, then press A through the results until the memory card is written."""
import os, time
import pk2

GCI = "/Volumes/LaCie/dolphin-duke/GC/EUR/Card A/01-GPVP-Pikmin2_SaveData.gci"
pad = pk2.Pad()


def locked():
    """Really out of control: frozen() alone read a wall as sunset (Day 6, 2026-11-03) and the A presses threw the
    purples out of the squad; they were left behind and lost. Two stick pushes, both ways, must move nothing."""
    if not pk2.frozen(pad):                    # frozen() only turns him in place: safe to poll
        return False
    if pk2.moved(pad, 0, 1, 0.4) or pk2.moved(pad, 0, -1, 0.4):
        pk2.goto(pad, *HOME, near=40)          # 2026-11-03: these test pushes walked him into water; 8 drowned
        return False
    return True


HOME = (512, 2662)


pk2.goto(pad, *HOME, near=60)             # wait on open ground by the ship, never against a wall
pk2.gather(pad)
print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)
import math
while not locked():                      # sunset takes the stick away
    if math.hypot(pk2.pos()[0] - HOME[0], pk2.pos()[1] - HOME[1]) > 60:
        pk2.goto(pad, *HOME, near=30)          # every poll nudges the stick: never let the drift add up
    time.sleep(5)
print("sunset", pk2.shot("sunset4"), flush=True)
t0 = os.path.getmtime(GCI)
for i in range(200):
    if os.path.getmtime(GCI) > t0:
        print("saved", i, flush=True); break
    if pk2.squad(0) and not locked():          # still in the field: whistle, never A (A throws a Pikmin)
        pad.press("B", 1500, after=1)
        continue
    pad.press("A", after=1.5)
    if i % 20 == 0:
        print("press", i, pk2.shot(f"end{i}"), flush=True)
time.sleep(5)
print(pk2.shot("day5"), flush=True)

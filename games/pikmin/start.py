"""Awakening Wood morning: press A through the ship's talk until Olimar really moves, then take every Pikmin out of
the ship (purples live in the hull). The ship's menu opens from (512, 2662), right beside the landing spot.
Retries the whole menu trip until the squad is non-empty: a first walk right after the talk often falls short, and
the menu sometimes needs a second A on OK."""
import sys
import time
import pk2

pad = pk2.Pad()
for i in range(50):
    if pk2.moved(pad, 0, -1, 0.5):
        break
    pad.press("A", after=1.3)
print("free", i, [round(v) for v in pk2.navi(0)], flush=True)
for trip in range(4):
    pk2.goto(pad, 512, 2662, near=15)
    pad.press("A", after=2.5)
    pad.cmd("stick 0 -1"); time.sleep(4); pad.cmd("release all"); time.sleep(0.3)
    for _ in range(3):
        pad.press("A", after=2.5)
        if pk2.squad(0):
            break
    if pk2.squad(0):
        break
    print("trip", trip, "no squad at", [round(v) for v in pk2.navi(0)], flush=True)
print("squad", pk2.squad(0), "alive", pk2.alive(), pk2.counts(0x805132EC), pk2.shot("start"), flush=True)
sys.exit(0 if pk2.squad(0) else 1)

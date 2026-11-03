"""Awakening Wood morning: press A through the ship's talk until Olimar really moves, then take every Pikmin out of
the ship (purples live in the hull). The ship's menu opens from (512, 2662), right beside the landing spot.
Retries the whole menu trip until the squad is non-empty: a first walk right after the talk often falls short, and
the menu sometimes needs a second A on OK."""
import sys
import time
import pk2

pad = pk2.Pad()
DS = pk2.HERE + "/.daystart"                   # steps.py stops new steps near sunset; a mid-day rerun keeps the clock
import os
if not os.path.exists(DS) or time.time() - float(open(DS).read()) > 13 * 60:
    open(DS, "w").write(str(time.time()))
for i in range(50):
    if pk2.moved(pad, 0, -1, 0.5):
        break
    pad.press("A", after=1.3)
print("free", i, [round(v) for v in pk2.navi(0)], flush=True)
print("plucked", pk2.pluck(pad), "sprouts left", len(pk2.sprouts()), flush=True)   # empty hands: A plucks, never throws
for trip in range(4):
    pk2.goto(pad, 512, 2662, near=15)
    pad.press("A", after=2.5)
    pad.cmd("stick 0 -1"); time.sleep(4); pad.cmd("release all"); time.sleep(0.3)
    for _ in range(3):
        pad.press("A", after=2.5)
        if pk2.counts(0x805132EC)["purple"]:
            break
    if pk2.counts(0x805132EC)["purple"]:
        break
    print("trip", trip, "no squad at", [round(v) for v in pk2.navi(0)], flush=True)
print("squad", pk2.squad(0), "alive", pk2.alive(), pk2.counts(0x805132EC), pk2.shot("start"), flush=True)
ONION = (405, 2470)   # Red Onion beside the ship: the centre of the ring its seeds land in (2026-11-03)
for trip in range(3):                          # Reds sleep in their Onion: take them all out too
    r0 = pk2.counts(0x805132EC)["red"]
    pk2.goto(pad, *ONION, near=25)
    pad.press("A", after=2.5)
    pad.cmd("stick 0 -1"); time.sleep(4); pad.cmd("release all"); time.sleep(0.3)
    pad.press("A", after=2.5)
    print("onion trip", trip, "reds", r0, "->", pk2.counts(0x805132EC)["red"], flush=True)
    if pk2.counts(0x805132EC)["red"] > r0:
        break
pk2.regroup(pad, r=500)
print("squad", pk2.squad(0), "alive", pk2.alive(), pk2.counts(0x805132EC), flush=True)
sys.exit(0 if pk2.counts(0x805132EC)["purple"] else 1)

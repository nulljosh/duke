"""Take every Pikmin out of the Red Onion at the landing site: A opens the menu, stick down moves them to the squad."""
import time

import pk2

pad = pk2.Pad()
print("control", pk2.control(pad, 40), flush=True)
pk2.goto(pad, -230, 2792, near=20)
pad.press("A", after=2)
pad.cmd("stick 0 -1")
time.sleep(4)
pad.cmd("release all")
pad.press("A", after=3)
print("plucked", pk2.pluck(pad), flush=True)
pad.press("B", 2000, after=0.5)
print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)

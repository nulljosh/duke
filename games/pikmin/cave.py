"""Walk the squad from the broken white gate to Emergence Cave (-190, 1160) and go down: A at the hole, then Yes."""
import time

import pk2

CAVE = (-190, 1160)
pad = pk2.Pad()
pad.press("B", 2000, after=0.5)
print("squad", pk2.squad(0), "travel", pk2.travel(pad, *CAVE, near=25), [round(v) for v in pk2.pos()], flush=True)
pad.press("A", after=2)
print(pk2.shot("cave_prompt"), flush=True)

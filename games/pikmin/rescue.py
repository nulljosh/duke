"""Floor-start fire rescue: load the checkpoint, clear the "Pikmin are suffering" box, whistle right on the purples,
then lead the whole squad away from the geysers. Prints alive so the caller can retry."""
import math
import sys
import time
import pk2

TO = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else (1400, 1090)
pad = pk2.Pad()
pk2.loadstate(pad)
pad.press("A", after=0.4)                      # the tutorial box (pauses the game) if it is up
for _ in range(3):
    ps = pk2.pikis(3)
    if ps:
        cx, cz = sum(p[0] for p in ps) / len(ps), sum(p[1] for p in ps) / len(ps)
        pk2.face(pad, cx, cz)
        pad.cmd("hold B"); time.sleep(1.2); pad.cmd("release all"); time.sleep(0.2)
    pad.press("A", after=0.3) if pk2.frozen(pad) else None
print("after whistle alive", pk2.alive(), "squad", pk2.squad(0), flush=True)
w = pk2.Walker(pad)
for _ in range(12):
    w.toward(*TO, 0.45)
pk2.regroup(pad, r=400)
print("alive", pk2.alive(), "squad", pk2.squad(0), [round(v) for v in pk2.pos()], flush=True)

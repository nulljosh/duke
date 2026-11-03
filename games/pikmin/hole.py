"""Take the hole down now: whistle once, walk the route to the hole, A, A. No roundup loop."""
import pk2
pk2.ITEM_MGRS.update(hole=0x805167C8)
pad = pk2.Pad()
pk2.regroup(pad, r=600)
hole = pk2.items("hole")[0]
print("squad", pk2.squad(0), "alive", pk2.alive(), "hole", [round(v) for v in hole], flush=True)
pk2.nav(pad, *hole, near=40, guard=False)
w = pk2.Walker(pad)
for _ in range(6):
    w.toward(*hole, 0.4)
pad.press("A", after=2)
pad.press("A", after=15)
print(pk2.shot("hole"), flush=True)

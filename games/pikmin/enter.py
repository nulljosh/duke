"""Go down the cave hole at (X, Z): walk onto it, A opens "Go in?", A on Yes. Exit 0 once the area changed."""
import sys
import time
import pk2

X, Z = float(sys.argv[1]), float(sys.argv[2])
pad = pk2.Pad()
pk2.regroup(pad, r=700)
print("squad", pk2.squad(0), "alive", pk2.alive(), "at", pk2.goto(pad, X, Z, near=25), flush=True)
pad.press("A", after=2)
print(pk2.shot("cave_prompt"), flush=True)
pad.press("A", after=20)
print(pk2.shot("cave_in"), flush=True)

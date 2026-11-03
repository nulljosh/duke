"""Carry one treasure home: walk the squad to it, swarm it, follow it until it is gone (delivered), whistle the squad back.
  python3 fetch.py X Z      treasure near (X, Z)"""
import math
import sys
import time
import pk2

X, Z = float(sys.argv[1]), float(sys.argv[2])
pad = pk2.Pad()
t0 = time.time()


def find():
    t = [p for p in pk2.pellets("treasure") if math.hypot(p["x"] - X, p["z"] - Z) < 1500]
    return min(t, key=lambda p: math.hypot(p["x"] - X, p["z"] - Z)) if t else None


p = find()
if not p:
    sys.exit("no treasure there")
idx = p["i"]
print("go", round(p["x"]), round(p["z"]), "squad", pk2.squad(0), flush=True)
pk2.regroup(pad)
arrived = pk2.nav(pad, p["x"], p["z"], near=110)
print("arrived", arrived, [round(v) for v in pk2.pos()], flush=True)
if arrived is False and math.hypot(pk2.pos()[0] - p["x"], pk2.pos()[1] - p["z"]) < 300:
    print("ledge: throwing the squad up", flush=True)   # the Sunseed Berry sits on a ledge the captain can't walk onto
    pk2.throw_at(pad, p["x"], p["z"], n=pk2.squad(0))
    time.sleep(6)
    arrived = True
if arrived is not True:
    print("abort", "threat" if isinstance(arrived, dict) else "stuck", flush=True)
    sys.exit(2)
lifted = False
for tries in range(6):
    pk2.swarm(pad, p["x"], p["z"], secs=3)
    time.sleep(3)
    q = next((q for q in pk2.pellets("treasure") if q["i"] == idx), None)
    if not q or math.hypot(q["x"] - p["x"], q["z"] - p["z"]) > 40:
        lifted = True
        break
    pk2.goto(pad, p["x"], p["z"], near=70)
if not lifted:                                 # walled in (the pot bulb sits inside a flower pot): throw them in
    print("walled: throwing the squad in", flush=True)
    pk2.throw_at(pad, p["x"], p["z"], n=pk2.squad(0))
    time.sleep(10)
    q = next((q for q in pk2.pellets("treasure") if q["i"] == idx), None)
    if not q or math.hypot(q["x"] - p["x"], q["z"] - p["z"]) > 40:
        lifted = True
print("lifted" if lifted else "stuck", round(time.time() - t0), "s", flush=True)
if not lifted:
    pk2.regroup(pad)
    sys.exit(1)
last, a0, t1 = None, pk2.alive(), time.time()
while True:
    if pk2.alive() < a0 or time.time() - t1 > 360:   # carriers eaten or the carry wedged: let steps.py roll back
        print("carry failed", "LOSS" if pk2.alive() < a0 else "timeout", flush=True)
        sys.exit(3)                                    # walk behind it so the stragglers rejoin when it lands
    q = next((q for q in pk2.pellets("treasure") if q["i"] == idx), None)
    if not q:
        break
    if last and math.hypot(q["x"] - last[0], q["z"] - last[1]) < 2:
        print("not moving", round(q["x"]), round(q["z"]), flush=True)
        pk2.swarm(pad, q["x"], q["z"], secs=2)
    last = (q["x"], q["z"])
    pk2.goto(pad, q["x"], q["z"], near=150, tries=8)
    time.sleep(4)
print("home", round(time.time() - t0), "s", pk2.shot("fetch"), flush=True)
time.sleep(4)
pk2.regroup(pad)
print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)

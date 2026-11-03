"""Kill one enemy with Louie's fists while Olimar's squad waits out of reach (wiki, Cloaking Burrow-nit: punching the
face with the leaders loses no Pikmin; four squad fights on 2026-11-03 each lost one or two to its proboscis).
Swaps to Louie (Y), walks him up, punches from the side with the most hp drop, swaps back.
  python3 punch.py ID X Z      exit 0 dead, 4 still alive after the punches, 3 a Pikmin died"""
import math
import sys
import time
import pk2

EID, X, Z = int(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
pad = pk2.Pad()
a0 = pk2.alive()


def target():
    es = [e for e in pk2.enemies() if e["id"] == EID and e["hp"] > 0 and math.hypot(e["x"] - X, e["z"] - Z) < 300]
    return min(es, key=lambda e: math.hypot(e["x"] - X, e["z"] - Z)) if es else None


pad.press("X", after=1.5)                      # dismiss first: with the captains together, Y hands Louie the
pad.press("Y", after=1.5)                      # whole squad (2026-11-03: he marched 25 Pikmin onto a Sheargrub)
pk2.ACTIVE = 1
print("louie at", [round(v) for v in pk2.pos()], "squad", pk2.squad(1), flush=True)
side, last = 0, None
for rnd in range(40):
    e = target()
    if not e or pk2.alive() < a0:
        break
    if last is not None and e["hp"] >= last and rnd % 3 == 0:
        side += 1                              # no damage for a round: the shell side, so circle a quarter turn
    last = e["hp"]
    ang = side * math.pi / 2
    pk2.goto(pad, e["x"] + 45 * math.sin(ang), e["z"] + 45 * math.cos(ang), near=15, tries=20)
    pk2.face(pad, e["x"], e["z"])
    for _ in range(6):
        pad.press("A", 80, after=0.3)
    print("round", rnd, "hp", round(e["hp"]), "side", side % 4, flush=True)
pad.press("Y", after=1.5)
pk2.ACTIVE = 0
pk2.regroup(pad, r=500)                        # Olimar whistles the dismissed squad back
e = target()
print("done hp", round(e["hp"]) if e else 0, "lost", a0 - pk2.alive(), pk2.shot("punch"), flush=True)
sys.exit(3 if pk2.alive() < a0 else 4 if e else 0)

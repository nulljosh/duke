#!/usr/bin/env python3
"""codes.py: walk to each room with a code anti-cube, enter its code (CodePattern from the level data), collect the cube.
  codes.py ROOM [ROOM ...]"""
import json, re, sys, time
import fez, fezmap, go


def volume(room):
    d = fezmap.level(room)
    for s in d["Scripts"].values():
        for t in s["Triggers"]:
            m = re.match(r"Volume\[(\d+)\]\.CodeAccepted", t)
            if m and any("SecretCube" in a for a in s["Actions"]): return d["Volumes"][m.group(1)]


def inside(s, v): return all(f <= p <= t for p, f, t in zip(s["pos"], v["From"], v["To"]))


for room in sys.argv[1:]:
    print("==", room, flush=True)
    if go.travel(room) is None: print("could not reach", room, flush=True); continue
    v = volume(room); s = fez.state()
    if not inside(s, v):   # step toward the volume's middle from the current camera
        hi, hs, _, _ = fezmap.VIEWS[s["view"]]
        fez.walk((v["From"][hi] + v["To"][hi]) / 2 * hs, tol=0.3); s = fez.state()
    print("inside" if inside(s, v) else "outside", s["pos"], v["From"], v["To"], flush=True)
    before = s["anti"]; s = fez.code(v["ActorSettings"]["CodePattern"])
    if s["items"]: go.collect(); s = fez.state()
    print(room, "anti", before, "->", s["anti"], flush=True)
    if s["anti"] > before: fez.snapshot()

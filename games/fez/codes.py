#!/usr/bin/env python3
"""codes.py: walk to each room with a code anti-cube, enter its code (CodePattern from the level data), collect the cube.
  codes.py ROOM [ROOM ...]"""
import json, re, sys, time
import fez, fezmap, go, trip


def volume(room):
    d = fezmap.level(room)
    for s in d["Scripts"].values():
        for t in s["Triggers"]:
            m = re.match(r"Volume\[(\d+)\]\.CodeAccepted", t)
            if m and any("SecretCube" in a for a in s["Actions"]): return int(m.group(1)), d["Volumes"][m.group(1)]


def inside(s, v): return all(f <= p <= t for p, f, t in zip(s["pos"], v["From"], v["To"]))


for room in sys.argv[1:]:
    print("==", room, flush=True)
    if trip.travel(room) is None: print("could not reach", room, flush=True); continue
    vid, v = volume(room); s = fez.state()
    h0 = fez.h(s)
    for d in (2, -2):   # Gomez arrives in a doorway, and an Up in the code would walk him straight back out
        s = fez.walk(h0 + d, tol=0.3); time.sleep(0.5); s = fez.state()
        if s["grounded"] and s["door"] is None and s["level"] == room: break
    if not inside(s, v):   # step toward the volume's middle from the current camera
        hi, hs, _, _ = fezmap.VIEWS[s["view"]]
        fez.walk((v["From"][hi] + v["To"][hi]) / 2 * hs, tol=0.3); s = fez.state()
    for view in ["Front", "Right", "Back", "Left"]:   # the game tests the volume from the camera: it must list it, not just contain Gomez
        if vid in s["volumes"]: break
        s = go.turn_to(view); time.sleep(0.5); s = fez.state()
    print("in volume" if vid in s["volumes"] else "NOT in volume", vid, s["view"], s["pos"], flush=True)
    if vid not in s["volumes"]: continue
    before = s["anti"]; s = fez.code(v["ActorSettings"]["CodePattern"])
    if s["items"]: trip.collect(); s = fez.state()
    print(room, "anti", before, "->", s["anti"], flush=True)
    if s["anti"] > before: fez.snapshot()

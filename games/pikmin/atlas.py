"""Spherical Atlas: throws land on top of the globe or beside it and the Pikmin stand idle. Whistle everyone, stand
off, and swarm (C-stick) into it until it moves."""
import math, time
import pk2

pad = pk2.Pad()
for attempt in range(6):
    a = pk2.pellets("item")
    if not a:
        print("atlas gone (delivered)", flush=True); break
    ax, az = a[0]["x"], a[0]["z"]
    pk2.gather(pad)
    px, pz = pk2.pos()
    ang = math.atan2(px - ax, pz - az) + attempt * 0.9
    print("pass", attempt, "goto", pk2.goto(pad, ax + 160 * math.sin(ang), az + 160 * math.cos(ang), near=30),
          "squad", pk2.squad(0), flush=True)
    pk2.swarm(pad, ax, az, 5)
    time.sleep(6)
    a = pk2.pellets("item")
    print("after swarm squad", pk2.squad(0), "atlas", a and (round(a[0]["x"]), round(a[0]["z"])), flush=True)
    if not a or math.hypot(a[0]["x"] - ax, a[0]["z"] - az) > 30:
        print("moving", flush=True); break
print(pk2.shot("atlas"), flush=True)

"""Fill a Candypop Bud's last slots: try standoff points all round it and throw only when the cursor sits on the mouth.
  python3 lastslot.py <bud index>"""
import collections, math, struct, sys, time
import pk2

src = open("bud.py").read().split("\nfor k in range")[0]   # poms() and the pad, not bud.py's run
ns = {}; exec(src, ns); poms, pad = ns["poms"], ns["pad"]
k = int(sys.argv[1])


def kinds():
    m = pk2.u32(0x80516674); mx, arr, opn = struct.unpack(">3I", pk2.read(m + 0x24, 12)); free = pk2.read(opn, mx)
    return dict(collections.Counter(pk2.read(arr + i * 0x2C8 + 0x2B8, 1)[0] for i in range(mx) if free[i] == 0))


b = poms()[k]
for t in range(16):
    if poms()[k]["used"] >= poms()[k]["total"]:
        break
    a = t * math.pi / 4
    pk2.goto(pad, b["x"] + 140 * math.sin(a), b["z"] + 140 * math.cos(a), near=20)
    while poms()[k]["swing"] > 0:
        time.sleep(0.5)
    miss = pk2.aim(pad, b["x"], b["z"], tries=4)
    if miss > 15:
        print("angle", t % 8, "miss", round(miss), "skip", flush=True)
        continue
    pad.press("A", 80, after=3)
    print("angle", t % 8, "miss", round(miss), "used", poms()[k]["used"], "kinds", kinds(), flush=True)
print("done", poms()[k], kinds(), flush=True)

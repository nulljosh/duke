"""Candypop Buds (Pom, enemy id 82): Obj +0x2C4 mUsedSlotCount, +0x2C8 mTotalSlotCount, +0x2D8 mPikiKind (3 purple),
+0x2E4 mSwingTimer. A bud swings shut when anything touches it (+0x2C0), so the squad stays back: stand 140 away,
throw one Pikmin at a time into the mouth, and check the slot count went up.  python3 bud.py"""
import math, struct, time
import pk2

pad = pk2.Pad()


def poms():
    n = pk2.u32(pk2.u32(0x80516560) + 0x30)
    while n:
        if pk2.u32(n + 0x1C) == 82:
            mgr = pk2.u32(n + 0x20); lim = pk2.u32(mgr + 0x2C)
            for off in range(0x44, 0x64, 4):
                q = pk2.u32(mgr + off)
                if 0x80000000 <= q < 0x81800000:
                    size, count = struct.unpack(">2I", pk2.read(q - 0x10, 8))
                    if count == lim and 0x200 <= size < 0x2000:
                        out = []
                        for i in range(lim):
                            o = q + i * size
                            x, _, z = struct.unpack(">3f", pk2.read(o + 0x18C, 12))
                            used, total = struct.unpack(">2i", pk2.read(o + 0x2C4, 8))
                            out.append(dict(x=x, z=z, used=used, total=total, swing=struct.unpack(">f", pk2.read(o + 0x2E4, 4))[0]))
                        return out
        n = pk2.u32(n + 4)
    return []


def sprouts_wait(t=8):
    time.sleep(t)
    return pk2.sprouts()


for k in range(len(poms())):
    if poms()[k]["used"] < poms()[k]["total"]:
        pk2.gather(pad)
    for attempt in range(12):
        if not pk2.squad(0):
            pk2.gather(pad)
        b = poms()[k]
        if b["used"] >= b["total"]:
            break
        others = [p for j, p in enumerate(poms()) if j != k]
        away = math.atan2(b["x"] - others[0]["x"], b["z"] - others[0]["z"]) if others else 0
        pk2.goto(pad, b["x"] + 150 * math.sin(away), b["z"] + 150 * math.cos(away), near=20)
        while poms()[k]["swing"] > 0:           # still swung shut from a touch: wait for it to open
            time.sleep(0.5)
        miss = pk2.aim(pad, b["x"], b["z"], tries=6)
        pad.press("A", 80, after=2.5)
        print("bud", k, "try", attempt, "miss", round(miss), "used", poms()[k]["used"], "squad", pk2.squad(0), "alive", pk2.alive(), flush=True)
    print("bud", k, "done", poms()[k], flush=True)
print("sprouts", len(sprouts_wait()), flush=True)
print("plucked", pk2.pluck(pad), "squad", pk2.squad(0), flush=True)
print(pk2.shot("purples"), flush=True)

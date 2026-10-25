#!/usr/bin/env python3
"""fezsave.py: what's left to collect, per room, from a FEZ save.
Reads the save (format from FEZ's SaveFileOperations) and compares each level's FilledConditions with the
map tree's Conditions (maptree.fezmap.json from FEZRepacker --unpack Other.pak).
  fezsave.py <save> [maptree.json]"""
import json, struct, sys

MAPTREE = "/Volumes/LaCie/fezdata/maptree.fezmap.json"
KEYS = ["CubeShardCount", "SplitUpCount", "SecretCount", "ChestCount", "OtherCollectibleCount", "LockedDoorCount", "UnlockedDoorCount"]


class R:
    def __init__(self, b): self.b, self.i = b, 0
    def take(self, fmt):
        v = struct.unpack_from("<" + fmt, self.b, self.i); self.i += struct.calcsize(fmt); return v[0]
    def i32(self): return self.take("i")
    def i64(self): return self.take("q")
    def bool(self): return self.take("?")
    def f32(self): return self.take("f")
    def string(self):
        n, shift = 0, 0
        while True:
            c = self.b[self.i]; self.i += 1; n |= (c & 0x7F) << shift; shift += 7
            if c < 0x80: break
        s = self.b[self.i:self.i + n].decode(); self.i += n; return s
    def nstr(self): return self.string() if self.bool() else None
    def nf32(self): return self.f32() if self.bool() else None


def level(r):
    destroyed = [(r.i32(), r.i32(), r.i32()) for _ in range(r.i32())]   # DestroyedTriles: collected pickups among them
    for _ in range(r.i32()): r.i32(); r.i32(); r.i32()   # InactiveTriles
    for _ in range(5):                                    # art objects, events, groups, volumes, NPCs
        for _ in range(r.i32()): r.i32()
    for _ in range(r.i32()): r.i32(); r.i32()             # PivotRotations
    r.nf32(); r.nstr(); r.bool()
    wc = {k: r.i32() for k in ["LockedDoorCount", "UnlockedDoorCount", "ChestCount", "CubeShardCount", "OtherCollectibleCount", "SplitUpCount"]}
    wc["ScriptIds"] = [r.i32() for _ in range(r.i32())]
    wc["SecretCount"] = r.i32()
    wc["destroyed"] = destroyed
    return wc


def read(path):
    r = R(open(path, "rb").read()); r.i = 8   # 8-byte CRC header before the version
    assert r.i64() == 6, "unknown save version"
    r.i64(); [r.bool() for _ in range(6)]
    for _ in range(r.i32()): r.nstr(); r.bool()
    sd = {"Level": r.nstr()}; r.i32(); r.f32(); r.f32(); r.f32(); r.i64()
    sd["Warps"] = [r.nstr() for _ in range(r.i32())]
    for k in ["Keys", "CubeShards", "SecretCubes", "CollectedParts", "CollectedOwls", "PiecesOfHeart"]: sd[k] = r.i32()
    sd["Maps"] = [r.nstr() for _ in range(r.i32())]
    sd["Artifacts"] = [r.i32() for _ in range(r.i32())]
    for _ in range(2): [r.nstr() for _ in range(r.i32())]   # achievements, gamer pictures
    r.nstr(); r.bool(); r.nf32(); [r.bool() for _ in range(5)]
    sd["World"] = {r.nstr(): level(r) for _ in range(r.i32())}
    return sd


def missing(sd, tree):
    out = []
    for node in tree.values():
        name, need = node["LevelName"], node["Conditions"]
        have = sd["World"].get(name)
        gap = {k: need[k] - (have[k] if have else 0) for k in KEYS[:5] if need[k] - (have[k] if have else 0) > 0}
        scripts = set(need["ScriptIds"]) - set(have["ScriptIds"] if have else [])
        if gap or scripts: out.append((name, have is not None, gap, sorted(scripts)))
    return out


if __name__ == "__main__":
    sd = read(sys.argv[1]); tree = json.load(open(sys.argv[2] if len(sys.argv) > 2 else MAPTREE))
    print({k: sd[k] for k in ["Level", "Keys", "CubeShards", "SecretCubes", "CollectedParts"]}, len(sd["World"]), "levels visited")
    for name, seen, gap, scripts in missing(sd, tree):
        print(f"{'  ' if seen else '* '}{name:28} {gap} {'scripts ' + str(scripts) if scripts else ''}")

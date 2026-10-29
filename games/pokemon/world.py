"""Hoenn as a graph, read from ROM. gMapGroups -> each MapHeader's layout, warps and edge connections
(include/global.fieldmap.h), names from pokeruby's data/maps/map_groups.json (maps.json here).

A node is (map, part): the tiles you can walk to from where you arrived, found by a tile BFS over the ROM layout
with the same collision, elevation, water and one-way ledge rules as nav.py. That is what splits Route 104 into
its south and north halves around Petalburg Woods."""
import json
from collections import deque
from pathlib import Path

GROUPS = 0x08308530                                    # gMapGroups
NAMES = json.loads((Path(__file__).parent / "maps.json").read_text())
SIDE = {1: "DOWN", 2: "UP", 3: "LEFT", 4: "RIGHT"}     # CONNECTION_SOUTH/NORTH/WEST/EAST
DIRS = {"UP": (0, -1), "DOWN": (0, 1), "LEFT": (-1, 0), "RIGHT": (1, 0)}
WATER = {0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x18, 0x19, 0x1A, 0x2A}
JUMP = {0x38: "RIGHT", 0x39: "LEFT", 0x3A: "UP", 0x3B: "DOWN"}
BLOCKERS = ("CuttableTree", "BreakableRock", "PushableBoulder", "Boulder", "Rock")
_maps, _beh = {}, {}


def u32(b, i):
    return int.from_bytes(b[i:i + 4], "little")


def s16(b, i):
    return int.from_bytes(b[i:i + 2], "little", signed=True)


def name(m):
    return NAMES.get(f"{m[0]}.{m[1]}", str(m))


def find(n):
    return next(tuple(map(int, k.split("."))) for k, v in NAMES.items() if v == n)


def tileset_beh(g, ts):
    if ts not in _beh:
        attrs = u32(g.read(ts, 0x14), 0x10)
        raw = b"".join(g.read(attrs + i, 1024) for i in range(0, 1024, 1024))
        _beh[ts] = [raw[i] for i in range(0, 1024, 2)]
    return _beh[ts]


class MapData:
    def __init__(self, g, m):
        import pk
        hdr = u32(g.read(u32(g.read(GROUPS + m[0] * 4, 4), 0) + m[1] * 4, 4), 0)
        h = g.read(hdr, 0x1C)
        lay = g.read(u32(h, 0), 0x18)
        self.w, self.h = u32(lay, 0), u32(lay, 4)
        raw = b"".join(g.read(u32(lay, 0x0C) + i, min(2048, self.w * self.h * 2 - i)) for i in range(0, self.w * self.h * 2, 2048))
        self.cells = [int.from_bytes(raw[i:i + 2], "little") for i in range(0, len(raw), 2)]
        self.beh = tileset_beh(g, u32(lay, 0x10)) + tileset_beh(g, u32(lay, 0x14))
        ev = g.read(u32(h, 4), 20)
        no, optr, nw, wptr = ev[0], u32(ev, 4), ev[1], u32(ev, 8)
        wr = g.read(wptr, nw * 8) if nw else b""
        self.warps = [((s16(wr, i * 8), s16(wr, i * 8 + 2)), (wr[i * 8 + 7], wr[i * 8 + 6]), wr[i * 8 + 5]) for i in range(nw)]
        orr = g.read(optr, no * 24) if no else b""
        self.objects = {}
        for i in range(no):
            o = orr[i * 24:i * 24 + 24]
            self.objects[(s16(o, 4), s16(o, 6))] = pk.name(u32(o, 16))
        self.edges = []
        if u32(h, 0x0C):
            c = g.read(u32(h, 0x0C), 8)
            craw = g.read(u32(c, 4), u32(c, 0) * 12) if u32(c, 0) else b""
            for i in range(u32(c, 0)):
                e = craw[i * 12:i * 12 + 12]
                if e[0] in SIDE:
                    self.edges.append((SIDE[e[0]], int.from_bytes(e[4:8], "little", signed=True), (e[8], e[9])))

    def cell(self, x, y):
        return self.cells[x + y * self.w] if 0 <= x < self.w and 0 <= y < self.h else None

    def behaviour(self, x, y):
        c = self.cell(x, y)
        return None if c is None else self.beh[c & 0x3FF]

    def open(self, x, y, ex, can=()):
        c = self.cell(x, y)
        if c is None or c & 0xC00:
            return False
        if self.beh[c & 0x3FF] in WATER and "surf" not in can:
            return False
        obj = self.objects.get((x, y), "")
        if any(b in obj for b in BLOCKERS) and not any(k in obj.lower() for k in can):
            return False
        e = c >> 12
        return e in (0, 15) or ex in (0, 15) or e == ex

    def reach(self, start, can=()):
        seen = {start}
        q = deque([start])
        while q:
            p = q.popleft()
            ex = (self.cell(*p) or 0) >> 12
            for d, (dx, dy) in DIRS.items():
                n = (p[0] + dx, p[1] + dy)
                jump = JUMP.get(self.behaviour(*n))
                if jump:
                    if jump != d:
                        continue
                    n = (n[0] + dx, n[1] + dy)
                if n not in seen and self.open(*n, ex, can):
                    seen.add(n)
                    q.append(n)
        return seen


def mapdata(g, m):
    if m not in _maps:
        _maps[m] = MapData(g, m)
    return _maps[m]


def exits(g, m, entry, can=()):
    """Hops out of the part of map m reachable from entry: (kind, tile, side, dest map, arrival tile)."""
    md = mapdata(g, m)
    seen = md.reach(entry, can)
    out = []
    for tile, dest, wid in md.warps:
        if dest[0] == 0x7F:
            continue
        near = tile in seen or any((tile[0] + dx, tile[1] + dy) in seen for dx, dy in DIRS.values())
        if near:
            try:
                arrive = mapdata(g, dest).warps[wid][0]
            except Exception:
                continue
            out.append(("warp", tile, None, dest, arrive))
    for side, off, dest in md.edges:
        try:
            dd = mapdata(g, dest)
        except Exception:
            continue
        for t in sorted(seen):
            x, y = t
            if side == "UP" and y == 0 and 0 <= x - off < dd.w:
                out.append(("edge", t, side, dest, (x - off, dd.h - 1)))
            elif side == "DOWN" and y == md.h - 1 and 0 <= x - off < dd.w:
                out.append(("edge", t, side, dest, (x - off, 0)))
            elif side == "LEFT" and x == 0 and 0 <= y - off < dd.h:
                out.append(("edge", t, side, dest, (dd.w - 1, y - off)))
            elif side == "RIGHT" and x == md.w - 1 and 0 <= y - off < dd.h:
                out.append(("edge", t, side, dest, (0, y - off)))
    return out, seen


def route(g, start, entry, goal, banned=(), can=()):
    """Fewest hops from (start map, entry tile) to the goal map. Each hop is (kind, tile, side, dest, arrival)."""
    key0 = (start, min(mapdata(g, start).reach(entry, can)))
    prev = {key0: None}
    q = deque([(start, entry, key0)])
    while q:
        m, ent, key = q.popleft()
        if m == goal:
            hops = []
            while prev[key]:
                key, hop = prev[key]
                hops.append(hop)
            return hops[::-1]
        outs, _ = exits(g, m, ent, can)
        for hop in outs:
            kind, tile, side, dest, arrive = hop
            if (m, tile, side) in banned:
                continue
            try:
                part = mapdata(g, dest).reach(arrive, can)
            except Exception:
                continue
            if not part:
                part = {arrive}
            k = (dest, min(part))
            if k not in prev:
                prev[k] = (key, hop)
                q.append((dest, arrive, k))
    return None


if __name__ == "__main__":
    import sys
    import nav
    import pk
    g = pk.GBA()
    x, y, grp, num = nav.where(g)
    for hop in route(g, (grp, num), (x, y), find(sys.argv[1])):
        print(hop[0], hop[1], hop[2], name(hop[3]), hop[4])

"""Walking. The map grid, collision and elevation rules are pokeruby's fieldmap.c: gBackupMapLayout holds the
loaded map with a 7-tile border, each block is metatile 0x3FF | collision 0xC00 | elevation 0xF000."""
from collections import deque

SB1 = 0x02025734              # gSaveBlock1: pos x, y (s16), then mapGroup, mapNum
LAYOUT = 0x03004870           # gBackupMapLayout: width, height (s32), map pointer
OBJECTS = 0x030048A0          # gObjectEvents, 16 x 36 bytes
OFF = 7
DIRS = {"UP": (0, -1), "DOWN": (0, 1), "LEFT": (-1, 0), "RIGHT": (1, 0)}


def s16(b, i):
    return int.from_bytes(b[i:i + 2], "little", signed=True)


def where(g):
    b = g.read(SB1, 6)
    return s16(b, 0), s16(b, 2), b[4], b[5]


def grid(g):
    b = g.read(LAYOUT, 12)
    w, h, ptr = (int.from_bytes(b[i:i + 4], "little") for i in (0, 4, 8))
    raw = b"".join(g.read(ptr + i, min(2048, w * h * 2 - i)) for i in range(0, w * h * 2, 2048))
    cells = [int.from_bytes(raw[i:i + 2], "little") for i in range(0, w * h * 2, 2)]
    return w, h, cells


def npcs(g):
    """Map coords of every active object except the player (gObjectEvents[i].currentCoords, minus the border)."""
    raw = g.read(OBJECTS, 16 * 36)
    out = set()
    for i in range(16):
        o = raw[i * 36:i * 36 + 36]
        if o[0] & 1 and not o[1] & 0x20 and not o[2] & 1:  # active, not invisible, not the player
            out.add((s16(o, 0x10) - OFF, s16(o, 0x12) - OFF))
    return out


def u32(b, i):
    return int.from_bytes(b[i:i + 4], "little")


def warps(g):
    """gMapHeader.events -> warps: (x, y) -> (mapGroup, mapNum, warpId)."""
    ev = u32(g.read(0x0202E828, 8), 4)          # gMapHeader.events
    e = g.read(ev, 12)
    n, ptr = e[1], u32(e, 8)
    raw = g.read(ptr, n * 8) if n else b""
    return {(s16(raw, i * 8), s16(raw, i * 8 + 2)): (raw[i * 8 + 7], raw[i * 8 + 6], raw[i * 8 + 5]) for i in range(n)}


WATER = {0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x18, 0x19, 0x1A, 0x2A}
JUMP = {0x38: "RIGHT", 0x39: "LEFT", 0x3A: "UP", 0x3B: "DOWN"}
GRASS = {0x02, 0x03}


def behaviours(g):
    """Metatile id -> behaviour byte, from gMapHeader.mapLayout's two tilesets (fieldmap.c GetMetatileAttributesById)."""
    lay = u32(g.read(0x0202E828, 4), 0)
    b = g.read(lay, 0x18)
    out = []
    for ts, n in ((u32(b, 0x10), 512), (u32(b, 0x14), 512)):
        attrs = u32(g.read(ts, 0x14), 0x10)
        raw = b"".join(g.read(attrs + i, 1024) for i in range(0, n * 2, 1024))
        out += [raw[i] for i in range(0, n * 2, 2)]
    return out


class Map:
    def __init__(self, g):
        self.w, self.h, self.cells = grid(g)
        self.beh = behaviours(g)

    def cell(self, x, y):
        gx, gy = x + OFF, y + OFF
        if not (0 <= gx < self.w and 0 <= gy < self.h):
            return None
        return self.cells[gx + gy * self.w]

    def behaviour(self, x, y):
        c = self.cell(x, y)
        return None if c is None else self.beh[c & 0x3FF]

    def open(self, x, y, ex):
        c = self.cell(x, y)
        if c is None or c & 0xC00 or self.beh[c & 0x3FF] in WATER:
            return False
        e = c >> 12
        return e in (0, 15) or ex in (0, 15) or e == ex

    def grass(self):
        return [(x - OFF, y - OFF) for y in range(OFF, self.h - OFF) for x in range(OFF, self.w - OFF - 1)
                if self.beh[self.cells[x + y * self.w] & 0x3FF] in GRASS and not self.cells[x + y * self.w] & 0xC00]


def path(g, goal, avoid_grass=False):
    """BFS over map coords to goal; ledges are one-way two-tile hops. Returns directions or None."""
    x0, y0, _, _ = where(g)
    m = Map(g)
    block = npcs(g)
    prev = {(x0, y0): None}
    q = deque([(x0, y0)])
    while q:
        p = q.popleft()
        if p == goal:
            steps = []
            while prev[p]:
                p, d = prev[p]
                steps.append(d)
            return steps[::-1]
        ex = (m.cell(*p) or 0) >> 12
        for d, (dx, dy) in DIRS.items():
            n = (p[0] + dx, p[1] + dy)
            jump = JUMP.get(m.behaviour(*n))
            if jump:
                if jump != d:
                    continue
                n = (n[0] + dx, n[1] + dy)
            if n in prev or (n in block and n != goal):
                continue
            if avoid_grass and m.behaviour(*n) in GRASS and n != goal:
                continue
            if n == goal or m.open(*n, ex):
                prev[n] = (p, d)
                q.append(n)
    return None


def step(g, d):
    """Hold a direction until the player moves one tile (a tap first turns them to face it)."""
    x, y, *_ = where(g)
    g.cmd(f"keys {g.KEYS[d]}")
    for _ in range(40):
        g.wait(2)
        if where(g)[:2] != (x, y):
            break
    g.cmd("keys 0")
    g.wait(8)
    return where(g)[:2] != (x, y)


def fight(g):
    """Wild or trainer battle: A picks FIGHT, then the first move, and clears every message.
    ponytail: always move 1; pick moves by type and HP once the party has more than Pound/Absorb."""
    n = 0
    while "Battle" in g.screen() or n < 3:
        g.press("A", after=20)
        n += 1
        if n > 600:
            raise SystemExit("battle never ended")
    g.wait(30)
    talk(g)
    return n


def walk(g, goal, limit=200):
    for _ in range(limit):
        if "Battle" in g.screen():
            fight(g)
        if where(g)[:2] == goal:
            return True
        p = path(g, goal)
        if not p:
            return False
        if not step(g, p[0]):
            g.wait(30)  # an NPC stepped in, or a door/warp is loading
    return where(g)[:2] == goal


def talk(g, limit=400):
    """Press A through a cutscene until script.c's sLockFieldControls drops. A takes the default on yes/no."""
    for _ in range(limit):
        if not g.r8(0x030006A4):          # sLockFieldControls
            g.wait(20)
            if not g.r8(0x030006A4):
                return True
        # sMessageBoxMode drops to hidden once the text is printed, while the box still waits for A,
        # so press A on every pass; a press during scripted walking does nothing.
        g.press("A", after=16)
    return False


def changed(g, m, frames=150):
    for _ in range(frames // 10):
        g.wait(10)
        if where(g)[2:] != m:
            g.wait(60)
            talk(g)
            return True
    return False


def warp(g, pos):
    """Walk onto a warp tile and through it. Doors fire on arrival; exit mats need one more step out."""
    m = where(g)[2:]
    if not walk(g, pos):
        return False
    if changed(g, m, 60):
        return True
    for d in ("DOWN", "UP", "LEFT", "RIGHT"):
        g.press(d, hold=20, after=10)
        if changed(g, m):
            return True
    return False


def edge(g, side):
    """Leave the map across one edge (UP, DOWN, LEFT, RIGHT) into the connected map."""
    m = where(g)[2:]
    w, h, cells = grid(g)
    mw, mh = w - 2 * OFF - 1, h - 2 * OFF
    if side in ("UP", "DOWN"):
        y = 0 if side == "UP" else mh - 1
        spots = [(x, y) for x in range(mw)]
    else:
        x = 0 if side == "LEFT" else mw - 1
        spots = [(x, y) for y in range(mh)]
    spots = [p for p in spots if not cells[(p[0] + OFF) + (p[1] + OFF) * w] & 0xC00]
    here = where(g)[:2]
    spots.sort(key=lambda p: abs(p[0] - here[0]) + abs(p[1] - here[1]))
    for p in spots[:6]:
        if walk(g, p):
            for _ in range(3):
                step(g, side)
                if changed(g, m, 30):
                    return True
    return False


def face(g, d):
    """Tap a direction to turn without walking (a tap shorter than a step only turns)."""
    g.press(d, hold=2, after=10)


def use(g, target, side="DOWN"):
    """Stand next to target on `side` of it, face it, press A."""
    dx, dy = DIRS[side]
    if not walk(g, (target[0] + dx, target[1] + dy)):
        return False
    back = {"DOWN": "UP", "UP": "DOWN", "LEFT": "RIGHT", "RIGHT": "LEFT"}[side]
    face(g, back)
    g.press("A", after=30)
    return True


def show(g):
    w, h, cells = grid(g)
    x0, y0, grp, num = where(g)
    block = npcs(g)
    print(f"map {grp}.{num} at {x0},{y0}  grid {w - 15}x{h - 14}")
    for y in range(h - 14):
        row = ""
        for x in range(w - 15):
            c = cells[(x + OFF) + (y + OFF) * w]
            row += "@" if (x, y) == (x0, y0) else "N" if (x, y) in block else "#" if c & 0xC00 else "."
        print(row)


if __name__ == "__main__":
    import pk
    show(pk.GBA())


def templates(g):
    """gMapHeader.events -> objectEvents: [(localId, graphicsId, x, y, script name)]."""
    import pk
    ev = u32(g.read(0x0202E828, 8), 4)
    e = g.read(ev, 8)
    n, ptr = e[0], u32(e, 4)
    raw = g.read(ptr, n * 24) if n else b""
    return [(raw[i * 24], raw[i * 24 + 1], s16(raw, i * 24 + 4), s16(raw, i * 24 + 6), pk.name(u32(raw, i * 24 + 16)))
            for i in range(n)]


def heal(g):
    """At a Pokemon Center 1F: the nurse stands behind the counter, so talk to her from two tiles below."""
    nx, ny = next((x, y) for _, gid, x, y, _ in templates(g) if gid == 58)   # graphicsId 58 is the nurse here
    walk(g, (nx, ny + 2))
    face(g, "UP")
    g.press("A", after=30)
    return talk(g)

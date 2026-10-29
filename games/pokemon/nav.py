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
        if o[0] & 1 and not o[0] & 0x40 and i:  # active, not invisible-ish; slot 0 is the player
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


def passable(cells, w, h, x, y, ex):
    gx, gy = x + OFF, y + OFF
    if not (0 <= gx < w and 0 <= gy < h):
        return False
    c = cells[gx + gy * w]
    if c & 0xC00:
        return False
    e = c >> 12
    return e in (0, 15) or ex in (0, 15) or e == ex


def path(g, goal):
    """BFS over map coords to goal (x, y); returns a list of directions or None."""
    x0, y0, _, _ = where(g)
    w, h, cells = grid(g)
    block = npcs(g)
    elev = lambda x, y: cells[(x + OFF) + (y + OFF) * w] >> 12
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
        for d, (dx, dy) in DIRS.items():
            n = (p[0] + dx, p[1] + dy)
            if n in prev or (n in block and n != goal):
                continue
            if n == goal or passable(cells, w, h, *n, elev(*p)):
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


def walk(g, goal, limit=200):
    for _ in range(limit):
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

"""Pikmin 2 client: the DSU pad (dsu.py on tcp 26761), screenshots of Dolphin's render window, and memory through
Dolphin's MemoryWatcher (it reads MemoryWatcher/Locations.txt at boot and sends each changed value to a unix socket).
Addresses are the European build's (GPVP01), from projectPiki/pikmin2's config/GPVP01/symbols.txt and the PlayData
layout in include/Game/gamePlayData.h.

python3 pk2.py A 'A*3' wait:2 shot:name   presses (seconds between), saves shots/name.png"""
import math
import os
import socket
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "shots")
USER = "/Volumes/LaCie/dolphin-duke"
PLAYDATA = 0x80516810                  # Game::playData (PlayData*)
WATCH = {                              # name -> MemoryWatcher line (pointer, then offset)
    "gameid": "80000000",              # "GPVP": proves the watcher is alive
    "playdata": "80516810",            # the PlayData pointer itself
    "pokos": "80516810 E8",            # mPokoCount
    "cave_pokos": "80516810 EC",       # mCavePokoCount
    "treasures": "80516810 BC",        # mTreasureCount
    "story": "80516810 2C",            # mHasContainerFlags.. mStoryFlags (4 bytes from _2C)
}
# Captains: naviMgr (MonoObjectMgr<Navi>) +0x28 is the Navi array, 0x320 bytes each; FakePiki::mPosition is +0x20C.
for n, base in (("olimar", 0x20C), ("louie", 0x320 + 0x20C)):
    for j, axis in enumerate("xyz"):
        WATCH[f"{n}_{axis}"] = f"80516660 28 {base + 4 * j:X}"
WATCH["olimar_dir"] = "80516660 28 1FC"                           # FakePiki::mFaceDir
for i, c in enumerate(["blue", "red", "yellow", "purple", "white", "bulbmin"]):
    WATCH[c] = f"80516810 {0x118 + 4 * i:X}"                       # mPikminToday[]


class Pad:
    def __init__(self, drive=True):
        """One driver at a time: five farm.py copies once fought over the stick (2026-10-29). The lock frees on exit."""
        import fcntl
        self.lock = open(os.path.join(HERE, ".pad.lock"), "w")
        try:
            drive and fcntl.flock(self.lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            sys.exit("pad busy: another bot script is driving")
        self.sock = socket.create_connection(("127.0.0.1", 26761))
        self.f = self.sock.makefile("rw")

    def cmd(self, line):
        self.f.write(line + "\n")
        self.f.flush()
        return self.f.readline().strip()

    def press(self, key, ms=120, after=0.4):
        self.cmd(f"press {key} {ms}")
        time.sleep(after)


def shot(name):
    """Dolphin's screenshot hotkey (SHARE on the DSU pad) works with the window hidden; screencapture does not."""
    import glob
    import shutil
    os.makedirs(SHOTS, exist_ok=True)
    pattern = os.path.join(USER, "ScreenShots", "**", "*.png")
    before = set(glob.glob(pattern, recursive=True))
    Pad(drive=False).press("SHARE", 120, after=0)     # the screenshot key moves nothing, so it skips the lock
    for _ in range(40):
        new = set(glob.glob(pattern, recursive=True)) - before
        if new:
            time.sleep(0.3)                    # let Dolphin finish writing it
            path = os.path.join(SHOTS, name + ".png")
            shutil.move(new.pop(), path)
            return path
        time.sleep(0.25)
    raise TimeoutError("no Dolphin screenshot")


class Memory:
    """Values Dolphin's MemoryWatcher pushes; call poll() to drain them."""
    def __init__(self):
        self.path = os.path.join(USER, "MemoryWatcher", "MemoryWatcher")
        if os.path.exists(self.path):
            os.unlink(self.path)
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
        self.sock.bind(self.path)
        self.sock.setblocking(False)
        self.vals = {}
        self.names = {v: k for k, v in WATCH.items()}

    def poll(self):
        while True:
            try:
                msg = self.sock.recv(4096).decode().split("\n")
            except BlockingIOError:
                return self.vals
            for i in range(0, len(msg) - 1, 2):
                key = self.names.get(msg[i].strip())
                if key:
                    self.vals[key] = int(msg[i + 1].strip() or "0", 16)


def locations():
    return list(WATCH.values())


if __name__ == "__main__":
    pad = Pad()
    for t in sys.argv[1:]:
        if t.startswith("wait:"):
            time.sleep(float(t[5:]))
        elif t.startswith("shot:"):
            print(shot(t[5:]))
        else:
            k, _, n = t.partition("*")
            for _ in range(int(n or 1)):
                pad.press(k)


def mem():
    """Latest watched values, from memd.py; floats decoded for positions."""
    import json
    import struct
    v = json.load(open(os.path.join(HERE, "mem.json")))
    for k in list(v):
        if k.endswith(("_x", "_y", "_z", "_dir")):
            v[k] = struct.unpack(">f", struct.pack(">I", v[k] & 0xFFFFFFFF))[0]
    return v


def moved(pad, x=0, y=1, secs=0.6):
    """Push the stick briefly; True if either captain moved, i.e. the player has control (no dialogue or cutscene)."""
    a = [navi(i)[:2] for i in (0, 1)]
    pad.cmd(f"stick {x} {y}")
    time.sleep(secs)
    pad.cmd("release all")
    time.sleep(0.4)
    b = [navi(i)[:2] for i in (0, 1)]
    return any(abs(q[0] - p[0]) + abs(q[1] - p[1]) > 20 for p, q in zip(a, b))


def frozen(pad):
    """True when the stick moves nothing at all, neither place nor facing: a message box is up. Against a wall the
    captain still turns, so a wall reads as not frozen."""
    a = navi()
    pad.cmd(f"stick {-math.sin(a[2]):.2f} {-math.cos(a[2]):.2f}")
    time.sleep(0.3)
    pad.cmd("release all")
    time.sleep(0.2)
    b = navi()
    return abs(b[0] - a[0]) + abs(b[1] - a[1]) < 1 and abs(_wrap(b[2] - a[2])) < 0.05


def control(pad, tries=60):
    """Press A through dialogue until the stick moves Olimar again. A only: START in the field opens the pause menu."""
    for i in range(tries):
        try:
            if moved(pad, 0, 1 if i % 2 else -1):
                return i
        except ValueError:                    # captains are unloaded during a floor or area change
            pass
        pad.press("A", after=1.2)
    raise TimeoutError("no control")


_gdb = None


def read(addr, n):
    """Bytes at a game address, through gdbd.py (Dolphin's GDB stub)."""
    global _gdb
    if _gdb is None:
        _gdb = socket.create_connection(("127.0.0.1", 26762)).makefile("rw")
    for _ in range(3):                         # a pointer read mid-frame can catch a freed object: E00, retry
        _gdb.write(f"r {addr:x} {n}\n")
        _gdb.flush()
        h = _gdb.readline().strip()
        if not h.startswith("E"):
            return bytes.fromhex(h)
        time.sleep(0.05)
    raise ValueError(f"read {addr:08x}: {h}")


def u32(addr):
    return int.from_bytes(read(addr, 4), "big")


def f32s(addr, n):
    import struct
    return struct.unpack(f">{n}f", read(addr, 4 * n))


COLORS = ["blue", "red", "yellow", "purple", "white", "bulbmin", "carrot"]   # Game::EPikiKind


def counts(addr):
    """A Game::GameStat PikiCounter: vtable, then one u32 per colour."""
    return dict(zip(COLORS, (int.from_bytes(read(addr + 4, 28)[i:i + 4], "big") for i in range(0, 28, 4))))


def squad(navi=0):
    return sum(counts(0x80512FEC + 0x20 * navi).values())   # GameStat::formationPikis[navi]


def alive():
    return sum(counts(0x805132EC).values())                   # GameStat::alivePikis


def enemies():
    """Live enemies: GeneralEnemyMgr (+0x30 first EnemyMgrNode: +0x04 next, +0x1C type id, +0x20 mgr), each mgr's
    mObjLimit +0x2C and its Obj array (+0x44 or later, it varies per enemy; MWCC's new[] puts element size and count
    16 bytes before the array, which picks the right field); EnemyBase mPosition +0x18C, mEvents +0x1E0
    (EB_Alive 0x10000000), mHealth +0x200."""
    import struct
    out = []
    n = u32(u32(0x80516560) + 0x30)
    while n:
        eid, mgr = u32(n + 0x1C), u32(n + 0x20)
        lim, obj, stride = u32(mgr + 0x2C), 0, 0
        for off in range(0x44, 0x64, 4):
            q = u32(mgr + off)
            if 0x80000000 <= q < 0x81800000:
                size, count = struct.unpack(">2I", read(q - 0x10, 8))
                if count == lim and 0x200 <= size < 0x2000:
                    obj, stride = q, size
                    break
        if not obj:
            n = u32(n + 0x04)
            continue
        for i in range(lim):
            b = read(obj + i * stride + 0x18C, 0x78)
            x, y, z = struct.unpack(">3f", b[:12])
            ev, hp = int.from_bytes(b[0x54:0x58], "big"), struct.unpack(">f", b[0x74:0x78])[0]
            if ev & 0x10000000:
                out.append(dict(id=eid, x=x, y=y, z=z, hp=hp))
        n = u32(n + 0x04)
    return out


def cursor(navi=None):
    """Where thrown Pikmin land: the NaviWhistle (Navi +0x28C) mPosition +0x0C."""
    navi = ACTIVE if navi is None else navi
    return f32s(u32(u32(u32(0x80516660) + 0x28) + 0x320 * navi + 0x28C) + 0x0C, 3)


ACTIVE = 0                                     # the captain the stick drives: 0 Olimar, 1 Louie (Y swaps)


def navi(i=None):
    """Live x, z and mFaceDir of a captain (naviMgr +0x28 array, 0x320 each; FakePiki +0x20C, +0x1FC)."""
    i = ACTIVE if i is None else i
    nb = u32(u32(0x80516660) + 0x28) + 0x320 * i
    x, _, z = f32s(nb + 0x20C, 3)
    return x, z, f32s(nb + 0x1FC, 1)[0]


def pos():
    return navi()[:2]


def _wrap(a):
    import math
    return (a + math.pi) % (2 * math.pi) - math.pi


class Walker:
    """mFaceDir = atan2(dx, dz) of the way Olimar walks, and it equals yaw - atan2(sx, sy) for a stick (sx, sy),
    where yaw is the camera's (measured 2026-10-29: up, right, down, left gave yaw, yaw - pi/2, yaw + pi, yaw + pi/2).
    The camera swings while walking, so yaw is re-estimated from the settled facing after every step."""
    yaw = None                                 # shared across walks: the camera moves slowly

    def __init__(self, pad):
        self.pad = pad
        if Walker.yaw is None:
            Walker.yaw = self.step(0.0, 0.35)

    def step(self, theta, secs):
        import math
        self.pad.cmd(f"stick {math.sin(theta):.3f} {math.cos(theta):.3f}")
        time.sleep(secs)
        face = navi()[2]
        self.pad.cmd("release all")
        return _wrap(face + theta)

    def toward(self, x, z, secs=0.3):
        import math
        px, pz, _ = navi()
        theta = _wrap(self.yaw - math.atan2(x - px, z - pz))
        y = self.step(theta, secs)
        Walker.yaw = _wrap(self.yaw + 0.5 * _wrap(y - self.yaw))


def goto(pad, x, z, near=30, tries=80):
    """Walk to (x, z). False when stuck: three steps with almost no progress (a wall, a ledge)."""
    import math
    w, stuck, last = Walker(pad), 0, 1e9
    for _ in range(tries):
        px, pz = pos()
        d = math.hypot(x - px, z - pz)
        if d < near:
            return True
        stuck = stuck + 1 if last - d < 5 else 0
        if stuck >= 3:
            if frozen(pad):                    # a tutorial box ate the stick: read it out, then keep walking
                control(pad, 30)
                stuck, last = 0, 1e9
                continue
            return False
        last = d
        w.toward(x, z, min(0.5, max(0.12, d / 400)))
    return False


def face(pad, x, z):
    """Turn toward (x, z) so the cursor, where throws land, points at it. Closed loop on the cursor itself: tap the
    stick (longer for a bigger turn), let the cursor settle, check again."""
    import math
    w = Walker(pad)
    for _ in range(8):
        px, pz, _ = navi()
        cx, _, cz = cursor()
        err = _wrap(math.atan2(x - px, z - pz) - math.atan2(cx - px, cz - pz))
        if abs(err) < 0.12:
            return
        w.toward(x, z, 0.08 + 0.12 * abs(err) / math.pi)   # a big turn needs the stick held longer
        time.sleep(0.2)


def aim(pad, x, z, tries=4):
    """Put the cursor on (x, z) and return how far off it is. The cursor sits a fixed reach ahead of the captain, so
    stand that reach short of the target on the line toward it, face it, and check where the cursor really is.
    Throws land on the cursor, and the whistle circle is centred on it too, not on the captain."""
    import math
    for _ in range(tries):
        px, pz = pos()
        cx, _, cz = cursor()
        reach = math.hypot(cx - px, cz - pz) or 90
        d = math.hypot(x - px, z - pz) or 1
        goto(pad, x - (x - px) / d * reach, z - (z - pz) / d * reach, near=15)
        face(pad, x, z)
        cx, _, cz = cursor()
        if math.hypot(cx - x, cz - z) < 25:
            break
    return math.hypot(cx - x, cz - z)


def throw_at(pad, x, z, n=5):
    miss = aim(pad, x, z)
    for _ in range(n):
        pad.press("A", 80, after=0.35)
    return miss


def swarm(pad, x, z, secs=4.0):
    """Hold the C-stick toward (x, z): the squad charges that way and grabs whatever it bumps into. Throws onto a big
    pellet like the Spherical Atlas land on top or beside it and the Pikmin just stand there; a swarm grabs it."""
    import math
    w = Walker(pad)
    px, pz, _ = navi()
    theta = _wrap(w.yaw - math.atan2(x - px, z - pz))  # same camera mapping as the main stick
    pad.cmd(f"cstick {math.sin(theta):.3f} {math.cos(theta):.3f}")
    time.sleep(secs)
    pad.cmd("release all")


def whistle_at(pad, x, z, ms=2000):
    """Whistle in the Pikmin around (x, z)."""
    miss = aim(pad, x, z)
    pad.press("B", ms, after=0.8)
    return miss


if __name__ == "__main__" and sys.argv[1:2] == ["selftest"]:
    assert abs(_wrap(7.0) - (7.0 - 6.283185307179586)) < 1e-9 and _wrap(-3.2) > 0




def waypoints():
    """The area's route graph, the one Pikmin carry along: mapMgr +0x08 GameRouteMgr, +0x1C u16 count, +0x20 the
    WayPoint array (0x78 each: +0x34 flags, +0x38 from-links count and +0x3A s16[8], +0x4C position, +0x58 radius,
    +0x5C to-links count and +0x5E s16[8]). Links are joined both ways. Returns {index: (x, z, radius, flags, links)}."""
    import struct
    rm = u32(u32(0x80516688) + 0x08)
    count, arr = int.from_bytes(read(rm + 0x1C, 2), "big"), u32(rm + 0x20)
    if u32(rm) == 0x804B2E90:                  # caves: EditorRouteMgr, a CNode list (+0x20 root, +0x10 child,
        blobs, node = [], u32(rm + 0x30)       # +0x04 next, +0x18 the WayPoint)
        while node and len(blobs) < count:
            blobs.append(read(u32(node + 0x18), 0x78))
            node = u32(node + 0x04)
    else:
        raw = b"".join(read(arr + i, min(4000, count * 0x78 - i)) for i in range(0, count * 0x78, 4000))
        blobs = [raw[i * 0x78:(i + 1) * 0x78] for i in range(count)]
    wps = {}
    for b in blobs:
        i = struct.unpack(">h", b[0x36:0x38])[0]  # mIndex: links name waypoints by it
        nf, nt = struct.unpack(">h", b[0x38:0x3A])[0], struct.unpack(">h", b[0x5C:0x5E])[0]
        links = set(struct.unpack(">8h", b[0x3A:0x4A])[:max(0, nf)]) | set(struct.unpack(">8h", b[0x5E:0x6E])[:max(0, nt)])
        x, _, z = struct.unpack(">3f", b[0x4C:0x58])
        wps[i] = (x, z, struct.unpack(">f", b[0x58:0x5C])[0], b[0x34], links)
    for i, w in wps.items():
        for j in w[4]:
            if j in wps:
                wps[j][4].add(i)
    return wps


def route(wps, a, b):
    """A* over the waypoints from the one nearest a to the one nearest b; a list of (x, z) ending at b."""
    import heapq
    import math
    near = lambda p: min(wps, key=lambda i: math.hypot(wps[i][0] - p[0], wps[i][1] - p[1]))
    s, g = near(a), near(b)
    dist = lambda i, j: math.hypot(wps[i][0] - wps[j][0], wps[i][1] - wps[j][1])
    best, prev, todo = {s: 0}, {}, [(dist(s, g), s)]
    while todo:
        _, i = heapq.heappop(todo)
        if i == g:
            break
        for j in wps[i][4]:
            c = best[i] + dist(i, j)
            if c < best.get(j, 1e18):
                best[j], prev[j] = c, i
                heapq.heappush(todo, (c + dist(j, g), j))
    path, i = [], g
    while i != s and i in prev:
        path.append(i)
        i = prev[i]
    path.append(s)
    return [(wps[i][0], wps[i][1]) for i in reversed(path)] + [b]


def travel(pad, x, z, near=40):
    """Walk straight there; only when that sticks, goto along the route graph. True on arrival.
    ponytail: the carry graph detours far around open ground, so it is the fallback, not the first try."""
    if goto(pad, x, z, near=near):
        return True
    pts = route(waypoints(), pos(), (x, z))
    for px, pz in pts[:-1]:
        goto(pad, px, pz, near=45)
    return goto(pad, x, z, near=near)


def detour(pad, x, z, near=40, tries=10):
    """travel() for caves: a cave's route graph reads as zeros, so when a straight walk sticks, sidestep along the wall
    (one side for three tries, then the other, longer each time) and try straight again.
    ponytail: bug-algorithm walk, no map; read the cave's map units if this keeps failing."""
    import math
    for t in range(tries):
        if goto(pad, x, z, near=near):
            return True
        w = Walker(pad)
        px, pz, _ = navi()
        side = 1 if (t // 3) % 2 == 0 else -1
        ang = math.atan2(x - px, z - pz) + side * math.pi / 2
        w.step(_wrap(w.yaw - ang), 0.5 + 0.3 * (t % 3))
    return goto(pad, x, z, near=near)


def pikis():
    """Live Pikmin x, z: pikiMgr MonoObjectMgr (+0x24 max, +0x28 array 0x2C8 each, +0x2C mOpenIds), FakePiki +0x20C."""
    import struct
    m = u32(0x80516674)
    mx, arr, opn = struct.unpack(">3I", read(m + 0x24, 12))
    free = read(opn, mx)
    out = []
    for i in range(mx):
        if free[i] == 0:
            x, _, z = struct.unpack(">3f", read(arr + i * 0x2C8 + 0x20C, 12))
            out.append((x, z))
    return out


def gather(pad):
    """Walk to the Pikmin that are not in the squad and whistle them in."""
    import math
    for _ in range(4):
        if squad(ACTIVE) >= alive():
            return True
        me = pos()
        far = max(pikis(), key=lambda p: math.hypot(p[0] - me[0], p[1] - me[1]))
        if math.hypot(far[0] - me[0], far[1] - me[1]) > 120:
            travel(pad, *far, near=80)
        whistle_at(pad, *far, ms=1500)        # plain B whistles at the cursor, which can sit far from the strays
    return squad(ACTIVE) >= alive()


def sprouts():
    """Planted Pikmin x, z: ItemPikihead::mgr (0x805167F0) MonoObjectMgr at +0x4C (+0x24 max, +0x28 array,
    +0x2C mOpenIds), item position +0x19C, stride by vtable repeat. Found by scan 2026-10-29, not in the headers."""
    import struct
    mx, arr, opn = struct.unpack(">3I", read(u32(0x805167F0) + 0x4C + 0x24, 12))
    free = read(opn, mx)
    used = [i for i in range(mx) if free[i] == 0]
    if not used:
        return []
    vt, blob = read(arr, 4), read(arr, 0x400)
    stride = next(k for k in range(0x100, len(blob) - 4, 4) if blob[k:k + 4] == vt)
    out = [struct.unpack(">f4xf", read(arr + i * stride + 0x19C, 12)) for i in used]
    return [p for p in out if p != (0.0, 0.0)]  # a seed still in the air has no position yet


def pluck(pad):
    """Walk onto each sprout and press A; returns how many joined the squad."""
    before = squad(ACTIVE)
    for x, z in sprouts():
        if (round(x), round(z)) in NOPLUCK:
            continue
        goto(pad, x, z, near=8)
        pad.press("A", 100, after=1.2)
        if (x, z) in sprouts():               # still there: not pluckable yet, and A would throw a Pikmin
            NOPLUCK.add((round(x), round(z)))
    return squad(ACTIVE) - before


NOPLUCK = set()


from pk2items import *  # noqa: E402,F401  pellets() and items(): memory reads split out for size

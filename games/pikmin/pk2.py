"""Pikmin 2 client: the DSU pad (dsu.py on tcp 26761), screenshots of Dolphin's render window, and memory through
Dolphin's MemoryWatcher (it reads MemoryWatcher/Locations.txt at boot and sends each changed value to a unix socket).
Addresses are the European build's (GPVP01), from projectPiki/pikmin2's config/GPVP01/symbols.txt and the PlayData
layout in include/Game/gamePlayData.h.

python3 pk2.py A 'A*3' wait:2 shot:name   presses (seconds between), saves shots/name.png"""
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
    def __init__(self):
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
    Pad().press("SHARE", 120, after=0)
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
    """Push the stick briefly; True if Olimar moved, i.e. the player has control (no dialogue or cutscene)."""
    a = mem()
    pad.cmd(f"stick {x} {y}")
    time.sleep(secs)
    pad.cmd("release all")
    time.sleep(0.4)
    b = mem()
    return abs(b["olimar_x"] - a["olimar_x"]) + abs(b["olimar_z"] - a["olimar_z"]) > 20


def control(pad, tries=60):
    """Press A through dialogue until the stick moves Olimar again. A only: START in the field opens the pause menu."""
    for i in range(tries):
        if moved(pad, 0, 1 if i % 2 else -1):
            return i
        pad.press("A", after=1.2)
    raise TimeoutError("no control")


_gdb = None


def read(addr, n):
    """Bytes at a game address, through gdbd.py (Dolphin's GDB stub)."""
    global _gdb
    if _gdb is None:
        _gdb = socket.create_connection(("127.0.0.1", 26762)).makefile("rw")
    _gdb.write(f"r {addr:x} {n}\n")
    _gdb.flush()
    h = _gdb.readline().strip()
    if h.startswith("E"):
        raise ValueError(f"read {addr:08x}: {h}")
    return bytes.fromhex(h)


def u32(addr):
    return int.from_bytes(read(addr, 4), "big")


def f32s(addr, n):
    import struct
    return struct.unpack(f">{n}f", read(addr, 4 * n))

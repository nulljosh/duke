"""Talks to the headless player (gba.c) on 127.0.0.1:8742.

python3 pk.py A A*5 DOWN wait:60 shot:intro   presses keys in order, then saves shots/intro.png
"""
import os
import socket
import sys
import time

KEYS = dict(A=1, B=2, SELECT=4, START=8, RIGHT=16, LEFT=32, UP=64, DOWN=128, R=256, L=512)
HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "shots")
# Symbol map from pret/pokeruby's symbols branch (pokesapphire_rev1.sym), the game's own decompiled code.
SYM = os.environ.get("SYM", "/Volumes/LaCie/src/pokeruby/pokesapphire_rev1.sym")
GMAIN, GTASKS = 0x03001770, 0x03004B20
_names = {}


def name(addr):
    if not _names:
        for line in open(SYM):
            a, _, _, n = line.split()[:4]
            _names[int(a, 16)] = n
    return _names.get(addr & ~1, hex(addr))


class GBA:
    KEYS = KEYS
    def __init__(self):
        self.sock = socket.create_connection(("127.0.0.1", 8742))
        self.file = self.sock.makefile()

    def cmd(self, line):
        self.sock.sendall((line + "\n").encode())
        return self.file.readline().strip()

    def frame(self):
        return int(self.cmd("frame"))

    def wait(self, frames):
        end = self.frame() + frames
        while self.frame() < end:
            time.sleep(0.005)

    def press(self, key, hold=4, after=10):
        self.cmd(f"keys {KEYS[key]}")
        self.wait(hold)
        self.cmd("keys 0")
        self.wait(after)

    def r8(self, a):
        return int(self.cmd(f"r8 {a}"))

    def r16(self, a):
        return int(self.cmd(f"r16 {a}"))

    def r32(self, a):
        return int(self.cmd(f"r32 {a}"))

    def read(self, a, n):
        return bytes.fromhex(self.cmd(f"rd {a} {n}"))

    def tasks(self):
        """Names of the game's active tasks, from gTasks (16 x 40 bytes) and the decomp's symbols."""
        raw = self.read(GTASKS, 16 * 40)
        out = []
        for i in range(16):
            t = raw[i * 40:i * 40 + 40]
            if t[4]:
                out.append(name(int.from_bytes(t[:4], "little")))
        return out

    def screen(self):
        """gMain.callback2, the screen's main loop."""
        return name(self.r32(GMAIN + 4))

    def shot(self, name):
        os.makedirs(SHOTS, exist_ok=True)
        path = os.path.join(SHOTS, name + ".png")
        assert self.cmd(f"shot {path}") == "ok"
        return path


def run(gba, tokens):
    for t in tokens:
        if t.startswith("wait:"):
            gba.wait(int(t[5:]))
        elif t.startswith("shot:"):
            print(gba.shot(t[5:]))
        elif t.startswith("save:") or t.startswith("load:"):
            print(gba.cmd(f"{t[:4]} {os.path.join(HERE, 'states', t[5:] + '.ss')}"))
        else:
            key, _, n = t.partition("*")
            for _ in range(int(n or 1)):
                gba.press(key)


if __name__ == "__main__":
    os.makedirs(os.path.join(HERE, "states"), exist_ok=True)
    run(GBA(), sys.argv[1:])

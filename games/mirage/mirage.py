#!/usr/bin/env python3
"""mirage.py: Duke plays Mirage, the desert platformer in Joshua Tree (user/mirage.c), from a fresh start to the end.

The game prints its own state as lines ("mirage: at ROOM X Y hp ...", "mirage: mobs L X Y HP ...") and Duke reads
them; it plays only by pressing keys. Mirage has a step mode ('.' turns it on, each 'n' runs five steps and prints the
state), so a busy machine can't make Duke miss a jump. That is the one assist: it pauses the clock, it never moves
Wren, sets a flag or skips a room.

  mirage.py host            play the real game logic on the Mac (joshuatree's tools/checks/mirage-core-check.py serve)
  mirage.py qemu            boot Joshua Tree headless with Mirage open and play it there (keys over QMP, state on serial)
  mirage.py host --route    also print the keys it pressed as a route joshuatree's check can replay

The rooms come from joshuatree's user/mirage_core.h, so a changed map changes the plan with it."""
import json, os, re, socket, subprocess, sys, tempfile, time
from pathlib import Path

JT = Path(os.environ.get("JT", Path.home() / "Documents/Code/joshuatree"))
STEP = 5   # steps per tick, what one 'n' runs in the game's step mode
CODE = {"a": 97, "d": 100, "w": 119, "s": 115, "sp": 32}
QCODE = {"a": "a", "d": "d", "w": "w", "s": "s", "sp": "spc", "n": "n", "dot": "dot"}


def rooms():
    src = (JT / "user/mirage_core.h").read_text()
    body = src.split("AR_MAP[AR_ROOMS][AR_H][AR_W + 1] = {")[1].split("\n};")[0]
    out = []
    for line in body.splitlines():
        if "/*" in line: out.append([])
        elif m := re.match(r'\s*"(.*)",', line): out[-1].append(m.group(1))
    return out


MAP = rooms()


def tile(room, tx, ty):
    if ty < 0 or ty >= 20: return "."
    if tx < 0: return "#" if room == 0 else "."
    if tx >= 40: return "#" if room == 4 else "."
    return MAP[room][ty][tx]


def solid(room, tx, ty, gate):
    c = tile(room, tx, ty)
    return c in "#=" or (c == "|" and not gate)


class Host:
    """The real mirage_core.h, compiled and run on the Mac by joshuatree's check."""
    def __init__(self):
        self.p = subprocess.Popen([sys.executable, str(JT / "tools/checks/mirage-core-check.py"), "serve"],
                                  stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
        self.log = []

    def tick(self, keys):
        for k in keys: self.p.stdin.write("k %d\n" % CODE[k])
        self.p.stdin.write("t %d\n" % STEP); self.p.stdin.flush()
        lines = []
        while True:
            l = self.p.stdout.readline()
            if not l: raise SystemExit("the harness died")
            lines.append(l.strip()); self.log.append(l.strip())
            if l.startswith("mirage: mobs"): return lines

    def close(self): self.p.kill()


class Qemu:
    """Joshua Tree's i386 kernel, headless, with Mirage opened from the boot line; keys go in over QMP, state comes
    back on the serial line."""
    def __init__(self):
        self.tmp = tempfile.mkdtemp(prefix="duke-mirage-")
        self.serial = os.path.join(self.tmp, "serial.log")
        s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
        self.q = subprocess.Popen(["qemu-system-i386", "-kernel", str(JT / "kernel.elf"), "-append", "open=mira",
                                   "-display", "none", "-vga", "std", "-qmp", f"tcp:127.0.0.1:{port},server,nowait",
                                   "-serial", "file:" + self.serial], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            time.sleep(0.2)
            try: self.s = socket.create_connection(("127.0.0.1", port)); break
            except OSError: pass
        else: raise SystemExit("QEMU's QMP never came up")
        self.f = self.s.makefile("rw"); self.f.readline(); self.cmd({"execute": "qmp_capabilities"})
        self.seen = 0; self.log = []
        if not self.wait("mirage: ready", 60): raise SystemExit("Mirage never opened")
        self.key("dot")
        if not self.wait("mirage: step on", 5): raise SystemExit("step mode did not turn on")

    def cmd(self, o):
        self.f.write(json.dumps(o) + "\n"); self.f.flush()
        while True:
            r = json.loads(self.f.readline())
            if "return" in r or "error" in r: return r

    def key(self, k):
        self.cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": QCODE[k]}]}}); time.sleep(0.03)

    def text(self):
        try: return open(self.serial, errors="replace").read()
        except OSError: return ""

    def wait(self, needle, secs):
        end = time.time() + secs
        while time.time() < end:
            if needle in self.text()[self.seen:]: return True
            time.sleep(0.05)
        return False

    def tick(self, keys):
        for k in keys: self.key(k)
        self.key("n")
        end = time.time() + 10
        while time.time() < end:
            new = self.text()[self.seen:]
            i = new.find("mirage: mobs")
            if i >= 0 and "\n" in new[i:]:
                j = i + new[i:].index("\n") + 1
                lines = [l[l.index("mirage:"):].strip() for l in new[:j].splitlines() if "mirage:" in l]   # past the kernel's "write(1) from ring 3:" prefix
                self.seen += j; self.log += lines
                return lines
            time.sleep(0.02)
        raise SystemExit("no state after a step; the last serial lines:\n" + self.text()[-400:])

    def close(self): self.q.kill()


class Player:
    def __init__(self, game):
        self.g, self.pressed, self.st, self.mobs, self.events = game, [], {}, [], []
        self.tick([])

    def tick(self, keys):
        self.pressed.append((list(keys), STEP))
        for l in self.g.tick(keys):
            if l.startswith("mirage: at "):
                v = l.split()
                self.st = dict(room=int(v[2]), x=int(v[3]), y=int(v[4]), hp=int(v[6]), staff=int(v[8]), key=int(v[10]),
                               gate=int(v[12]), king=int(v[14]), talk=int(v[16]), beaten=int(v[18]), ground=int(v[20]))
            elif l.startswith("mirage: mobs"):
                v = l.split()[2:]
                self.mobs = [(v[i], int(v[i + 1]), int(v[i + 2]), int(v[i + 3])) for i in range(0, len(v), 4)]
            else:
                self.events.append(l); print(" ", l, flush=True)

    # what is around Wren
    def feet_row(self): return (self.st["y"] + 16) // 16
    def body_row(self): return (self.st["y"] + 8) // 16

    def hostile_near(self, d):
        """a scorpion or bat (or the woken Dust King) within reach in front of her"""
        x, y = self.st["x"], self.st["y"]
        for L, mx, my, hp in self.mobs:
            if L not in "SBD": continue
            w = 32 if L == "D" else 16
            ahead = mx - (x + 13) if d > 0 else x + 3 - (mx + w)
            if -4 <= ahead <= 18 and my < y + 16 and my + w > y: return True
        return False

    def danger(self, d, gap):
        """what Wren must jump in direction d within gap pixels of her box: a wall, spines or a pit (or None)"""
        r, x, gate = self.st["room"], self.st["x"], self.st["gate"]
        br, fr = self.body_row(), self.feet_row()
        for g in range(1, gap + 1, 3):
            edge = x + 12 + g if d > 0 else x + 3 - g
            tx = edge // 16 if edge >= 0 else -1
            if solid(r, tx, br, gate) or solid(r, tx, br - 1, gate) and not solid(r, tx, br - 2, gate): return "wall"
            if tile(r, tx, br) == "^" or tile(r, tx, fr - 1) == "^": return "spines"
            if 0 <= tx < 40 and not solid(r, tx, fr, gate): return "pit"
        return None

    def jump_now(self, d):
        """"jump" if something is in the way within a tick of walking (7.5 px) and a margin, "wait" when a jump over a
        pit would land on a scorpion (stand until it walks off), else None"""
        why = self.danger(d, 13)
        if not why: return None
        land = self.st["x"] + 60 * d
        if why == "pit" and any(L == "S" and abs(mx - land) < 40 for L, mx, my, hp in self.mobs): return "wait"
        return "jump"

    def clear_talk(self):
        while self.st["talk"]: self.tick(["sp"])

    def go(self, x, jumps=True, settle=True):
        """walk to x on this floor, jumping walls, pits and spines, swinging at anything in the way"""
        for _ in range(400):
            if self.st["talk"]: self.clear_talk(); continue
            dx = x - self.st["x"]
            if abs(dx) <= 5 and (self.st["ground"] or not settle): self.tick(["s"]); return
            d = 1 if dx > 0 else -1
            keys = ["d" if d > 0 else "a"]
            if self.st["staff"] and self.hostile_near(d): self.tick(["s", "sp"]); continue   # stand and swing
            j = self.jump_now(d) if jumps and self.st["ground"] and abs(dx) > 8 else None
            if j == "wait": self.tick(["s"]); continue
            if j == "jump": keys.append("w")
            self.tick(keys)
            if abs(dx) < 12 and self.st["ground"]: self.tick(["s"])   # close: one tick of walking (7.5 px), then stop
        raise SystemExit("could not reach x=%d (at %s)" % (x, self.st))

    def hop(self, x, y):
        """jump from here toward x and land on the ledge whose standing height is y"""
        d = 1 if x > self.st["x"] else -1
        k = "d" if d > 0 else "a"
        self.tick(["w", k])
        for _ in range(40):
            self.tick([k] if abs(x - self.st["x"]) > 6 else ["s"])
            if self.st["ground"] and self.st["y"] <= y + 1: self.tick(["s"]); return
        raise SystemExit("missed the hop to %d,%d (at %s)" % (x, y, self.st))

    def exit(self, d, room):
        k = "d" if d > 0 else "a"
        for _ in range(200):
            if self.st["room"] == room: return
            if self.st["talk"]: self.clear_talk(); continue
            keys = [k]
            if self.st["staff"] and self.hostile_near(d): self.tick(["s", "sp"]); continue
            j = self.jump_now(d) if self.st["ground"] else None
            if j == "wait": self.tick(["s"]); continue
            if j == "jump": keys.append("w")
            self.tick(keys)
        raise SystemExit("never reached room %d (at %s)" % (room, self.st))

    def fight(self):
        """face the Dust King and swing when he is in reach; step back when he is too close"""
        for _ in range(2000):
            if self.st["beaten"]: return
            if self.st["talk"]: self.clear_talk(); continue
            king = [m for m in self.mobs if m[0] == "D"]
            if not king: self.tick([]); continue
            kx = king[0][1]; x = self.st["x"]
            d = 1 if kx + 16 > x + 8 else -1
            gap = kx + 2 - (x + 13) if d > 0 else x + 3 - (kx + 30)
            if gap < 2 and self.st["ground"]: self.tick(["a" if d > 0 else "d"])   # too close: back off
            elif gap <= 14: self.tick(["d" if d > 0 else "a", "s", "sp"])          # face him, stand, swing
            else: self.tick(["d" if d > 0 else "a"])
        raise SystemExit("the fight never ended (%s)" % self.st)


def play(game):
    p = Player(game)
    p.clear_talk()                                     # the opening lines
    p.go(150); p.tick(["s"]); p.clear_talk()           # Elder Pina: the staff
    assert p.st["staff"], "Pina did not hand over the staff"
    p.exit(1, 1)                                       # Red Canyon
    p.exit(1, 2)                                       # the Cholla Caves
    p.go(455)                                          # under the first ledge, then up them for the key
    p.hop(490, 240); p.go(472)
    p.hop(440, 192); p.go(455)
    p.hop(490, 144); p.go(472)
    p.hop(440, 96); p.go(370)
    p.hop(330, 48)
    p.go(48)
    assert p.st["key"], "no key at the top"
    p.go(600, jumps=False, settle=False)               # down the ledges like stairs
    p.exit(1, 3)                                       # the Salt Flats, through the gate
    p.exit(1, 4)                                       # the Mesa
    p.clear_talk()
    p.fight()
    return p


def main():
    game = Qemu() if sys.argv[1:2] == ["qemu"] else Host()
    t = time.time()
    try:
        p = play(game)
    finally:
        game.close()
    print("beaten in %d steps (%.0f s here), %d hearts left" % (len(p.pressed) * STEP, time.time() - t, p.st["hp"]))
    if "--route" in sys.argv:   # joshuatree's ROUTE format: the keys of one tick (or -), its steps, then xN for N in a row
        rows = []
        for keys, n in p.pressed:
            row = (" ".join(keys) or "-") + " %d" % n
            if rows and rows[-1][0] == row: rows[-1][1] += 1
            else: rows.append([row, 1])
        for row, k in rows: print(row + (" x%d" % k if k > 1 else ""))


if __name__ == "__main__":
    main()

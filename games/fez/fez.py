#!/usr/bin/env python3
"""fez.py: drive modded FEZ (HAT + FEZUG) from the shell, in the background.
Keys go straight to the FEZ process (CGEvent postToPid) and screenshots come from its window id,
so FEZ never needs focus and the terminal stays usable. FEZ's Settings has pauseOnLostFocus false.
  fez.py cmd "hud_position 1"    type a FEZUG console command
  fez.py key right 600           hold a key for N ms
  fez.py key right+space 600 150 run right, jump 150 ms in
  fez.py shot name               screenshot of the FEZ window to shots/name.png
  fez.py start                   launch FEZ in the background and load slot 3
  fez.py state                   Gomez's live state from the SurfBridge mod (bridge/)"""
import json, os, re, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
CODES = {"enter": 36, "space": 49, "left": 123, "right": 124, "down": 125, "up": 126, "esc": 53,
         "tab": 48, "tilde": 50, "a": 0, "d": 2, "w": 13, "s": 1, "ctrl": 59, "shift": 56,
         "i": 34, "j": 38, "k": 40, "l": 37}


def pid():
    p = subprocess.run(["pgrep", "-x", "HAT.bin.osx"], capture_output=True, text=True).stdout.split()
    if not p: sys.exit("FEZ is not running")
    return p[0]


def window():
    for line in subprocess.run([str(HERE / "win"), "list", pid()], capture_output=True, text=True).stdout.splitlines():
        if line.rstrip().endswith("FEZ"): return line.split()[0]
    sys.exit("no FEZ window")


def key(name, ms=80, delay=0):
    """name can combine keys with '+': 'right+space' runs right and jumps `delay` ms in."""
    subprocess.run([str(HERE / "key"), pid(), ",".join(str(CODES[n]) for n in name.split("+")), str(ms), str(delay)], check=True)


def cmd(text):
    key("tilde"); time.sleep(1.0)   # ponytail: typed text is dropped if it arrives under ~0.8 s after the console opens or a submit
    subprocess.run([str(HERE / "key"), pid(), "text", text], check=True); time.sleep(0.2)
    key("enter"); time.sleep(1.0)
    key("tilde"); time.sleep(0.5)


STATE = Path.home() / "Library/Application Support/FEZ/surfbridge.json"


def state():
    """Live state written by the SurfBridge mod a few times a second (level, pos, view, cubes, items, holes)."""
    for _ in range(20):   # the mod rewrites the file several times a second; a read can land mid-swap
        try: return json.loads(STATE.read_text())
        except (OSError, ValueError): time.sleep(0.02)
    return None


# Screen-horizontal coordinate per camera view (Right view: walking right lowers z, measured 2026-10-25).
AXIS = {"Front": (0, 1), "Right": (2, -1), "Back": (0, -1), "Left": (2, 1)}


def h(s):
    i, sign = AXIS[s["view"]]; return s["pos"][i] * sign


_server = None


def edge(name, down):
    """Press or release one key through a long-lived key process (separate processes do not hold a key)."""
    global _server
    if _server is None or _server.poll() is not None:
        _server = subprocess.Popen([str(HERE / "key"), pid(), "serve"], stdin=subprocess.PIPE, text=True)
    _server.stdin.write(f"{'d' if down else 'u'} {CODES[name]}\n"); _server.stdin.flush()


def walk(target, tol=0.2, timeout=8):
    """Walk until Gomez's screen-horizontal coordinate reaches target. Returns the final state."""
    s = state(); t0 = time.time(); held = None; last, still = None, 0
    while s and time.time() - t0 < timeout:
        d = target - h(s)
        if abs(d) <= tol: break
        want = "right" if d > 0 else "left"
        if abs(d) < 1.2:   # close in with short taps: Gomez carries about half a unit of momentum at full walk
            if held: edge(held, False); held = None; time.sleep(0.25)
            edge(want, True); time.sleep(0.04); edge(want, False); time.sleep(0.15); s = state()
        else:
            if want != held:
                if held: edge(held, False)
                edge(want, True); held = want
            time.sleep(0.05); s = state()
        if not s["grounded"] and s["action"] not in ("Treading", "Swimming"): break
        still = still + 1 if last is not None and abs(h(s) - last) < 0.01 else 0
        last = h(s)
        if still > 12: break   # blocked by a wall or teetering at an edge
    if held: edge(held, False)
    time.sleep(0.1); return state()


def drop(off, steer=None, timeout=6):
    """Walk off an edge toward `off` ('left'/'right'); once airborne, hold `steer` to drift back under the ledge."""
    s = state(); t0 = time.time(); edge(off, True)
    while s and s["grounded"] and time.time() - t0 < 3: time.sleep(0.03); s = state()
    edge(off, False)
    if steer: edge(steer, True)
    while s and not s["grounded"] and time.time() - t0 < timeout: time.sleep(0.03); s = state()
    if steer: edge(steer, False)
    time.sleep(0.2); return state()


def hop(target, jump_ms=200, timeout=2.5, lead=0.6):
    """Jump toward screen-horizontal `target`, holding the direction until Gomez is over it, then land."""
    s = state(); d = "right" if target > h(s) else "left"; sign = 1 if d == "right" else -1
    edge(d, True); time.sleep(0.04); edge("space", True); t0 = time.time(); held = True
    while time.time() - t0 < timeout:
        el = time.time() - t0; s = state()
        if el > jump_ms / 1000: edge("space", False)
        if held and (h(s) - target) * sign >= -lead: edge(d, False); held = False
        if el > 0.3 and (s["grounded"] or s["action"].startswith("Grab")): break
        time.sleep(0.02)
    if held: edge(d, False)
    edge("space", False); time.sleep(0.4); return state()


def runjump(edge_h, target, jump_ms=450, timeout=3):
    """Run toward `target`, jump when Gomez reaches `edge_h` (the ledge end), hold until over target, land."""
    s = state(); d = "right" if target > h(s) else "left"; sign = 1 if d == "right" else -1
    edge(d, True); t0 = time.time(); jumped = None; held = True
    while time.time() - t0 < timeout:
        s = state(); x = h(s)
        if jumped is None and (x - edge_h) * sign >= -0.3: edge("space", True); jumped = time.time()
        if jumped and time.time() - jumped > jump_ms / 1000: edge("space", False)
        if held and jumped and (x - target) * sign >= -0.1: edge(d, False); held = False
        if jumped and time.time() - jumped > 0.3 and (s["grounded"] or s["action"].startswith("Grab")): break
        time.sleep(0.02)
    if held: edge(d, False)
    edge("space", False); time.sleep(0.4); return state()


SAVES = Path.home() / "Library/Application Support/FEZ"


def picker_slot():
    p = shot("picker")
    subprocess.run(["sips", "-c", "80", "400", "--cropOffset", "295", "280", str(p), "--out", str(p)], capture_output=True)
    out = subprocess.run([str(HERE / "ocr"), str(p), "fast"], capture_output=True, text=True).stdout
    m = re.search(r"SLOT\s*(\d)", out.replace("\\/", "/"))
    return int(m.group(1)) if m else None


def start(slot=3):
    keep = {p: (p.read_bytes(), p.stat().st_mtime) for p in SAVES.glob("SaveSlot[01]")}   # Joshua's slots, restored on a misstep
    mine = SAVES / f"SaveSlot{slot - 1}"; mine.touch()   # the picker opens on the newest save, so make ours the newest
    if not subprocess.run(["pgrep", "-x", "HAT.bin.osx"], capture_output=True).stdout:
        subprocess.run(["open", "-g", "/Volumes/LaCie/Steam/steamapps/common/FEZ/FEZ.app"])
        for _ in range(45):   # the LaCie is a spinning disk: launch can take well over 30 s
            time.sleep(2)
            if subprocess.run(["pgrep", "-x", "HAT.bin.osx"], capture_output=True).stdout: break
        time.sleep(25)
    STATE.unlink(missing_ok=True)
    for _ in range(10):   # the title swallows Enter until it has finished loading: press until the slot picker shows
        key("enter"); time.sleep(4)
        if (n := picker_slot()) is not None: break
    for _ in range(8):   # the picker opens on the last slot played, so read its "SLOT n / 4" label and step to ours
        if n == slot: break
        key("right", 120); time.sleep(1.2); n = picker_slot()
    if n != slot: sys.exit(f"slot picker shows {n}, wanted {slot}")
    key("enter"); time.sleep(3)
    for _ in range(30):   # the main menu ignores Enter while it animates in, so keep pressing until a level loads
        key("enter"); time.sleep(3)
        if (s := state()) and not s["loading"]:
            if s.get("slot") == slot - 1: cmd("timescale 1.5")   # Joshua asked for faster play; a restart resets it to 1.0
            if s.get("slot") != slot - 1:   # never play Joshua's own slots
                subprocess.run(["pkill", "-x", "HAT.bin.osx"]); time.sleep(2)
                for p, (b, m) in keep.items(): p.write_bytes(b); os.utime(p, (m, m))
                sys.exit(f"loaded slot {s.get('slot', '?')}, wanted {slot - 1}; quit")
            return s


def responsive():
    """FEZ sometimes stops taking movement keys while the console key still works (twice on 2026-10-26).
    Nudge left and right: if Gomez can stand and nothing moves him, input is dead."""
    a = state(); key("left", 250); time.sleep(0.2); b = state(); key("right", 250); time.sleep(0.2); c = state()
    return not (a["grounded"] and a["pos"] == b["pos"] == c["pos"])


def revive():
    """Restart FEZ when it has stopped taking input. Progress since the last door is lost."""
    if responsive(): return state()
    print("FEZ stopped taking input: restarting", flush=True)
    subprocess.run(["pkill", "-x", "HAT.bin.osx"]); time.sleep(4); return start()


def shot(name):
    (HERE / "shots").mkdir(exist_ok=True)
    p = HERE / "shots" / f"{name}.png"
    subprocess.run(["screencapture", "-x", "-o", "-l", window(), str(p)], check=True)
    subprocess.run(["sips", "-Z", "960", str(p)], capture_output=True)   # ponytail: 960 wide is enough to read the HUD
    return p


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "cmd": cmd(" ".join(a[1:]))
    elif a[0] == "key": key(a[1], int(a[2]) if len(a) > 2 else 80, int(a[3]) if len(a) > 3 else 0)
    elif a[0] == "shot": print(shot(a[1]))
    elif a[0] == "start": print(json.dumps(start()))
    elif a[0] == "state": print(json.dumps(state()))
    elif a[0] == "drop": s = drop(a[1], a[2] if len(a) > 2 else None); print(s["view"], round(h(s), 2), s["pos"], s["action"])
    elif a[0] == "hop": s = hop(float(a[1])); print(s["view"], round(h(s), 2), s["pos"], s["action"])
    elif a[0] == "walk": s = walk(float(a[1])); print(s["view"], round(h(s), 2), s["pos"], s["action"])

#!/usr/bin/env python3
"""fez.py: drive modded FEZ (HAT + FEZUG) from the shell, in the background.
Keys go straight to the FEZ process (CGEvent postToPid) and screenshots come from its window id,
so FEZ never needs focus and the terminal stays usable. FEZ's Settings has pauseOnLostFocus false.
  fez.py cmd "hud_position 1"    type a FEZUG console command
  fez.py key right 600           hold a key for N ms
  fez.py key right+space 600 150 run right, jump 150 ms in
  fez.py shot name               screenshot of the FEZ window to shots/name.png"""
import subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
CODES = {"enter": 36, "space": 49, "left": 123, "right": 124, "down": 125, "up": 126, "esc": 53,
         "tab": 48, "tilde": 50, "a": 0, "d": 2, "w": 13, "s": 1, "ctrl": 59, "shift": 56,
         "i": 34, "j": 38, "k": 40, "l": 37}


def pid():
    p = subprocess.run(["pgrep", "-f", "HAT.bin.osx"], capture_output=True, text=True).stdout.split()
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

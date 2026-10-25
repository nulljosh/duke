#!/usr/bin/env python3
"""fez.py: drive modded FEZ (HAT + FEZUG) from the shell.
Every input goes through front(), which refuses to send unless FEZ is the frontmost app,
so a key never lands in another window.
  fez.py cmd "warp NATURE_HUB"   type a FEZUG console command
  fez.py key right 600           hold a key for N ms
  fez.py key right+space 600 150 run right, jump 150 ms in
  fez.py shot name               screenshot to shots/name.png"""
import subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROC = "HAT.bin.osx"
CODES = {"enter": 36, "space": 49, "left": 123, "right": 124, "down": 125, "up": 126, "esc": 53,
         "tab": 48, "tilde": 50, "a": 0, "d": 2, "w": 13, "s": 1, "ctrl": 59, "shift": 56}


def osa(script):
    return subprocess.run(["osascript", "-e", script], capture_output=True, text=True).stdout.strip()


def front():
    if osa('tell application "System Events" to get name of first process whose frontmost is true') != PROC:
        osa(f'tell application "System Events" to set frontmost of process "{PROC}" to true')
        time.sleep(0.6)
    if osa('tell application "System Events" to get name of first process whose frontmost is true') != PROC:
        sys.exit(f"{PROC} is not frontmost; refusing to send input")


def key(name, ms=80, delay=0):
    """name can combine keys with '+': 'right+space' runs right and jumps `delay` ms in."""
    front()
    subprocess.run([str(HERE / "key"), ",".join(str(CODES[n]) for n in name.split("+")), str(ms), str(delay)], check=True)


def cmd(text):
    key("tilde"); time.sleep(0.4)
    front(); osa(f'tell application "System Events" to keystroke "{text}"'); time.sleep(0.3)
    key("enter"); time.sleep(0.5)
    key("tilde"); time.sleep(0.3)


def shot(name):
    (HERE / "shots").mkdir(exist_ok=True)
    p = HERE / "shots" / f"{name}.png"
    subprocess.run(["screencapture", "-x", str(p)], check=True)
    subprocess.run(["sips", "-Z", "1280", str(p)], capture_output=True)   # ponytail: 1280 wide is enough to read the HUD
    return p


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "cmd": cmd(" ".join(a[1:]))
    elif a[0] == "key": key(a[1], int(a[2]) if len(a) > 2 else 80, int(a[3]) if len(a) > 3 else 0)
    elif a[0] == "shot": print(shot(a[1]))

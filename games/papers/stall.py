"""Watch the running day from outside: exit (and so wake whoever waits on it) when the desk's words have not
changed for six minutes while a day.py runs, which is the bot looping on one entrant (day 15: 20 minutes on a
permit while the passport hid under it). Only screenshots, never input: safe beside the bot."""
import json, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent


def words():
    wid = subprocess.run([str(HERE.parent / "fez" / "win"), "list", subprocess.run(["pgrep", "PapersPlease"], capture_output=True, text=True).stdout.split()[0]], capture_output=True, text=True).stdout
    w = next(l.split()[0] for l in wid.splitlines() if l.split()[-1] == "PapersPlease")
    subprocess.run(["screencapture", "-x", "-o", "-l", w, "/tmp/papers-stall.png"])
    out = json.loads(subprocess.run([str(HERE.parent / "fez" / "ocr"), "/tmp/papers-stall.png"], capture_output=True, text=True).stdout or "[]")
    return {o["t"] for o in out if o["x"] > 360 and o["y"] > 236 and len(o["t"]) > 5}


same, last = 0, None
while subprocess.run(["pgrep", "-f", "day.py"], capture_output=True).returncode == 0:
    try: now = words()
    except Exception: now = None
    same = same + 1 if now and last and len(now & last) >= 0.8 * max(len(now), 1) and len(now) >= 4 else 0
    last = now
    if same >= 6: sys.exit(f"stalled: {sorted(now)[:8]}")
    time.sleep(60)

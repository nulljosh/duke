"""Play Papers, Please days from screenshots: call the next entrant, read the passport, stamp, hand it back.
The game window must be in front: Unity only takes the real cursor (cliclick), not events posted to its pid.
Coordinates are window points, top-left of the content under the title bar included (same as the screenshot)."""
import json, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageStat

HERE = Path(__file__).resolve().parent
FEZ = HERE.parent / "fez"
SHOT = Path("/tmp/papers-shot.png")
HORN, TRAY_OPEN, TRAY_CLOSE = (347, 181), (1128, 340), (588, 340)
COUNTER, DESK, ENTRANT = (176, 518), (700, 400), (180, 350)
STAMP_X = {"approve": 975, "deny": 735}   # stamp centres when the tray is open; the visa box goes under one


def window():
    pid = subprocess.run(["pgrep", "PapersPlease"], capture_output=True, text=True).stdout.split()[0]
    for line in subprocess.run([str(FEZ / "win"), "list", pid], capture_output=True, text=True).stdout.splitlines():
        p = line.split()
        if p[-1] == "PapersPlease": return int(p[3]), int(p[4])
    raise SystemExit("no PapersPlease window")


OX, OY = window()
def at(x, y): return f"{round(OX + x)},{round(OY + y)}"
def cli(*a): subprocess.run(["cliclick", *a])
def click(p): cli(f"m:{at(*p)}", "w:120", f"c:{at(*p)}")


def drag(a, b):
    """Unity samples the cursor once a frame: move in small timed steps and send the release twice."""
    steps = [f"m:{at(a[0] + (b[0] - a[0]) * i / 6, a[1] + (b[1] - a[1]) * i / 6)}" for i in range(1, 7)]
    cli(f"m:{at(*a)}", "w:150", f"dd:{at(*a)}", "w:200", *[s for st in steps for s in (st, "w:80")], "w:150", f"du:{at(*b)}")
    time.sleep(0.2); cli(f"du:{at(*b)}")


def shot():
    subprocess.run(["screencapture", "-x", f"-R{OX},{OY},1140,668", str(SHOT)]); return Image.open(SHOT).convert("L")


def ocr(): return json.loads(subprocess.run([str(FEZ / "ocr"), str(SHOT)], capture_output=True, text=True).stdout or "[]")


def doc_on_counter(img):   # the empty counter is one flat olive; a document breaks it up
    return ImageStat.Stat(img.crop((110, 470, 250, 570))).stddev[0] > 25


def verdict(words):
    """Day 1: Arstotzkan citizens only. The issuing country is printed on every passport."""
    desk = " ".join(w["t"].upper() for w in words if w["x"] > 360 and w["y"] > 236)
    return "approve" if "ARSTOTZ" in desk.replace(" ", "") else "deny"


def entrant():
    click(HORN)
    t0 = time.time()
    while not doc_on_counter(shot()):
        if time.time() - t0 > 15: return None
        time.sleep(0.5)
    time.sleep(0.8); drag(COUNTER, DESK); time.sleep(1.2)
    shot(); words = ocr(); v = verdict(words)
    visa = next((w for w in words if "VISA" in w["t"].upper()), {"x": 697, "y": 367})
    grab = (visa["x"], visa["y"] + 150)
    drop = (grab[0] + STAMP_X[v] - visa["x"], grab[1])
    drag(grab, drop); time.sleep(0.5)
    click(TRAY_OPEN); time.sleep(1.0); click((STAMP_X[v], 330)); time.sleep(1.0); click(TRAY_CLOSE); time.sleep(0.8)
    drag(drop, ENTRANT); time.sleep(3)
    return v, [w["t"] for w in words if w["x"] > 360 and w["y"] > 236]


if __name__ == "__main__":
    for n in range(int(sys.argv[1]) if len(sys.argv) > 1 else 30):
        r = entrant()
        print(n, r, flush=True)
        if r is None: break

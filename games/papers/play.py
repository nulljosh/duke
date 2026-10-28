"""Play Papers, Please days from screenshots: call the next entrant, read the passport, stamp, hand it back.
The game window must be in front: Unity only takes the real cursor (cliclick), not events posted to its pid.
Coordinates are window points, top-left of the content under the title bar included (same as the screenshot)."""
import json, re, subprocess, sys, time
import rules
from rules import KEEP, verdict
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

HERE = Path(__file__).resolve().parent
FEZ = HERE.parent / "fez"
SHOT = Path("/tmp/papers-shot.png")
HORN, TRAY_OPEN, TRAY_CLOSE = (347, 181), (1128, 340), (588, 340)
INSPECT, PRINTER = (1108, 640), (178, 612)   # inspect-mode toggle; the transcript printer is the interrogate button
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
def idle():
    out = subprocess.run(["ioreg", "-c", "IOHIDSystem"], capture_output=True, text=True).stdout
    return int(re.search(r'"HIDIdleTime" = (\d+)', out)[1]) / 1e9


def mine():
    """Wait until the game is in front. The real cursor is Joshua's too: if he has another app up, only take it back once he's been idle two minutes."""
    while True:
        front = subprocess.run(["lsappinfo", "info", "-only", "name", subprocess.run(["lsappinfo", "front"], capture_output=True, text=True).stdout.strip()],
                               capture_output=True, text=True).stdout
        if "PapersPlease" in front: return
        if "Steam" in front or idle() > 120:   # Steam's store window is our own launch popping up, not his
            subprocess.run(["osascript", "-e", 'tell application "System Events" to set frontmost of (first process whose name is "PapersPlease") to true']); time.sleep(1)
        else: time.sleep(5)


def cli(*a): mine(); subprocess.run(["cliclick", *a])
def click(p): cli(f"m:{at(*p)}", "w:120", f"c:{at(*p)}")


def drag(a, b):
    """Unity samples the cursor once a frame: move in small timed steps and send the release twice."""
    steps = [f"m:{at(a[0] + (b[0] - a[0]) * i / 4, a[1] + (b[1] - a[1]) * i / 4)}" for i in range(1, 5)]
    cli(f"m:{at(*a)}", "w:100", f"dd:{at(*a)}", "w:120", *[s for st in steps for s in (st, "w:50")], "w:100", f"du:{at(*b)}")
    time.sleep(0.1); cli(f"du:{at(*b)}")


def shot():
    subprocess.run(["screencapture", "-x", f"-R{OX},{OY},1140,668", str(SHOT)]); return Image.open(SHOT).convert("L")


def ocr(): return json.loads(subprocess.run([str(FEZ / "ocr"), str(SHOT)], capture_output=True, text=True).stdout or "[]")


CBOX = (0, 455, 356, 580)   # the counter between the entrant and the desk


def doc_on_counter(img, base):
    """Centre of whatever sits on the counter that was not there when it was empty, or None."""
    m = ImageChops.difference(img.crop(CBOX), base).point(lambda v: 255 if v > 40 else 0).getbbox()
    return ((m[0] + m[2]) // 2, CBOX[1] + (m[1] + m[3]) // 2) if m and (m[2] - m[0]) * (m[3] - m[1]) > 200 else None


DBOX, PARK = (360, 236, 1110, 668), (1000, 650)   # the desk; papers nobody takes back get parked bottom right
FACEBOX, FACE = (60, 250, 300, 445), None
SAME, EMPTY, PENALTIES = 0, None, 0   # the desk as it looks with nothing new on it, refreshed before each entrant


def parked(x, y): return x > 850 and y > 540


def blob(img, base, box, skip=()):
    """Centre of the busiest cell of whatever changed inside box, so a grab lands on paper and not between two sheets."""
    diff = ImageChops.difference(img.crop(box), base).point(lambda v: 255 if v > 40 else 0)
    if not diff.getbbox(): return None
    w, h = diff.size; cw, ch = w // 8, h // 6
    cells = [(ImageStat.Stat(diff.crop((x, y, x + cw, y + ch))).mean[0], box[0] + x + cw // 2, box[1] + y + ch // 2)
             for x in range(0, w - cw + 1, cw) for y in range(0, h - ch + 1, ch)]
    score, cx, cy = max([c for c in cells if c[1:] not in skip and not parked(*c[1:])] or [(0, 0, 0)])
    return (cx, cy) if score > 60 else None


def keep_gifts():
    """Park the papers that are ours by their printed title, so the sweep hands back only what the entrant owns."""
    global PENALTIES
    for _ in range(4):
        shot(); ws = [w for w in ocr() if not parked(w["x"], w["y"]) and w["x"] > 360 and w["y"] > 236]
        w = next((w for w in ws if re.search(KEEP, w["t"].upper())), None)
        if not w: return
        PENALTIES += any(re.search(r"ASSESS|CREDITS", v["t"].upper()) for v in ws)   # counted while the slip is fresh mid-desk, before it is parked
        if PENALTIES >= 2: raise SystemExit("two penalties: stop and replay the day")
        drag((w["x"], min(w["y"] + 15, 650)), PARK); time.sleep(0.6)


def sweep(to, tries=6):
    """Drag everything new on the desk to `to` (the entrant, or the parking corner)."""
    tried = []
    for _ in range(tries):
        p = blob(shot(), EMPTY, DBOX, tried)
        if not p: return
        drag(p, to); tried.append(p); time.sleep(0.6)   # a paper that won't go stays put: try the next busiest spot


SPOTS = [(650, 400), (965, 380), (460, 600)]   # where each handed-over document goes on the desk


def at_booth(img):   # the counter strip is olive in the booth and black on the night screen
    return ImageStat.Stat(img.crop(CBOX)).mean[0] > 60


def entrant(day, base):
    global EMPTY, SAME, FACE
    if not at_booth(shot()): return None
    keep_gifts(); time.sleep(0.4); EMPTY = shot().crop(DBOX)   # the last citation goes to the corner; the desk as it is now is the baseline
    click(HORN)
    t0 = time.time()
    while not doc_on_counter(img := shot(), base):
        if not at_booth(img): return None
        if time.time() - t0 > 40: return "nobody came"   # still in the booth: a missed horn, call again
        time.sleep(0.3)
    walk = time.time() - t0
    face = shot().crop(FACEBOX)
    same = FACE is not None and ImageStat.Stat(ImageChops.difference(face, FACE)).mean[0] < 8
    SAME, FACE = (SAME + 1 if same else 0), face   # the same face back at the booth: the last entrant never left
    if SAME >= 2: raise SystemExit("same entrant three times: stop and replay the day")
    spots = []
    for spot in SPOTS:   # the entrant slides papers over one at a time, sometimes the passport last and slow
        t = time.time()
        while not (at_ := doc_on_counter(shot(), base)) and time.time() - t < 2.5: time.sleep(0.3)
        if not at_: break
        drag(at_, spot); spots.append(spot); time.sleep(0.6)
    t1 = time.time(); r = decide(day, spots, base)
    print(f"walk {walk:.1f}s slide {t1 - t0 - walk:.1f}s decide {time.time() - t1:.1f}s", flush=True)   # where the seconds go
    return r


def missing_passport():
    """No passport: highlight the rule and the empty counter in inspect mode, then click the transcript printer to
    interrogate (the INTERROGATE label is only a hint). The entrant then hands over a temporary visa slip to deny on."""
    drag((253, 615), (730, 420)); time.sleep(1.2)   # rule book onto the desk, far enough right to read both pages
    shot(); ws = ocr()
    toc = next((w for w in ws if "BASIC" in w["t"].upper()), None)
    if toc: click((toc["x"], toc["y"])); time.sleep(1.2); shot(); ws = ocr()
    rule = next((w for w in ws if re.search(r"MU[SA]T HAVE", w["t"].upper())), None)
    if rule:
        click(INSPECT); time.sleep(1.0); click((rule["x"], rule["y"] + 8)); time.sleep(0.8)
        click((300, 550)); time.sleep(2.5); click(PRINTER); time.sleep(6)
    shot(); ws = ocr()
    if any("HIGHLIGHT" in w["t"].upper() for w in ws): click(INSPECT); time.sleep(1.0); shot(); ws = ocr()   # papers don't move in inspect mode
    book = next((w for w in ws if w["t"].upper() == "RULES"), None)
    if book: drag((book["x"], book["y"] + 10), (253, 615)); time.sleep(1.0)   # file the book again


def reveal(spots, words):
    """Three papers overlap on this desk. Lift each one, newest first, to the open middle of the desk until the passport
    shows; keep what was read before unless the passport now covers it."""
    for spot in reversed(spots):
        drag(spot, (700, 330)); time.sleep(0.5); shot(); now = ocr()
        v = next((w for w in now if re.search(r"VISA|STAMP ?HE", w["t"].upper())), None)
        if v: return now + [w for w in words if not (abs(w["x"] - v["x"]) < 125 and -150 < w["y"] - v["y"] < 210)]
    return None


def decide(day, spots, base=None):
    """Read the desk, stamp the passport, hand every document back."""
    shot(); words = ocr(); v = verdict(words, day)
    if day >= 3 and not any(re.search(r"VISA|STAMP ?HE", w["t"].upper()) for w in words):
        late = base is not None and doc_on_counter(shot(), base)   # a passport still on the counter is late, not missing
        if late and len(spots) < 5:
            spot = (700, 560); drag(late, spot); spots.append(spot); time.sleep(0.6); return decide(day, spots, base)
        seen = reveal(spots, words)
        if seen: words = seen; v = verdict(words, day)
        elif day == 3 or not spots: missing_passport(); shot(); words = ocr(); v = "deny"   # a real no-passport entrant: interrogate
        else: v = "deny"   # papers but no passport found: hand everything back rather than interrogate over a lost one
    visa = next((w for w in words if re.search(r"VISA|STAMP ?HE", w["t"].upper())), None)
    if visa:   # the passport: slide its visa box under the chosen stamp
        grab = (visa["x"], min(visa["y"] + 150, 580))   # a temporary visa slip sits low on the desk
        drop = (grab[0] + STAMP_X[v] - visa["x"], grab[1])
        drag(grab, drop); time.sleep(0.5)
        click(TRAY_OPEN); time.sleep(0.7); click((STAMP_X[v], 330)); time.sleep(0.7); click(TRAY_CLOSE); time.sleep(0.5)
        drag(drop, ENTRANT); time.sleep(0.5)
    def give_back():
        if EMPTY is None:
            for spot in spots: drag(spot, ENTRANT); time.sleep(0.5)
        else: keep_gifts(); sweep(ENTRANT)   # everything the entrant owns goes back; citations, ads and notes stay
    give_back(); time.sleep(1)
    for _ in range(3):   # something on the counter: a paper dropped short, or a gift handed over at the end (the note)
        left = base is not None and doc_on_counter(shot(), base)
        if not left: break
        drag(left, (700, 450)); time.sleep(0.6); spots = []; give_back(); time.sleep(1.0)
    return v, [w["t"] for w in words if w["x"] > 360 and w["y"] > 236]


def _check():
    empty, frame = Image.new("L", (750, 432)), Image.new("L", (1140, 668)); frame.paste(255, (660, 336, 860, 486))
    x, y = blob(frame, empty, DBOX); assert 660 <= x <= 860 and 336 <= y <= 486 and blob(Image.new("L", (1140, 668)), empty, DBOX) is None
    rules._check()

if __name__ == "__main__":
    _check()
    day = int(sys.argv[1])
    base = Image.open(HERE / '.counter.png') if (HERE / '.counter.png').exists() else shot().crop(CBOX)   # the empty counter
    base.save(HERE / '.counter.png')
    shot(); b = next((w for w in ocr() if re.search(r"BULLETIN|INSPECTOR", w["t"].upper())), {"x": 745, "y": 460})
    drag((b["x"], b["y"] + 100), (105, 612)); time.sleep(1)   # file the day's bulletin, wherever it lands, so it stays out of the OCR
    EMPTY = shot().crop(DBOX)
    for n in range(int(sys.argv[2]) if len(sys.argv) > 2 else 80):
        r = entrant(day, base)
        print(n, r, flush=True)
        if r is None: break
    else: raise SystemExit("still in the booth after the cap")

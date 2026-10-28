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


subprocess.run(["osascript", "-e", 'tell application "System Events" to set position of window 1 of (first process whose name is "PapersPlease") to {390, 50}'])
OX, OY = window()   # pinned at (390, 50) first: the window once slid down 126 px mid-day and every click missed
def at(x, y): return f"{round(OX + x)},{round(OY + y)}"
def idle():
    out = subprocess.run(["ioreg", "-c", "IOHIDSystem"], capture_output=True, text=True).stdout
    return int(re.search(r'"HIDIdleTime" = (\d+)', out)[1]) / 1e9


def mine():
    """Wait until the game is in front. The real cursor is Joshua's too: if he has another app up, take it back only
    once the mouse has sat still for 90 seconds (a 10-second synthetic event keeps HIDIdleTime from ever growing)."""
    still, pos = time.time(), None
    while True:
        front = subprocess.run(["lsappinfo", "info", "-only", "name", subprocess.run(["lsappinfo", "front"], capture_output=True, text=True).stdout.strip()],
                               capture_output=True, text=True).stdout
        if "PapersPlease" in front: return
        now = subprocess.run(["cliclick", "p"], capture_output=True, text=True).stdout.strip()
        if now != pos: still, pos = time.time(), now
        if "Steam" in front or idle() > 120 or time.time() - still > 90:   # Steam's store window is our own launch popping up
            subprocess.run(["osascript", "-e", 'tell application "System Events" to set frontmost of (first process whose name is "PapersPlease") to true']); time.sleep(1)
        else: time.sleep(5)


def cli(*a): mine(); subprocess.run(["cliclick", *a])
def click(p): cli(f"m:{at(*p)}", "w:120", f"c:{at(*p)}")


def drag(a, b):
    """Unity samples the cursor once a frame: move in small timed steps and send the release twice."""
    mid = at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    cli(f"m:{at(*a)}", f"dd:{at(*a)}", f"m:{mid}", f"m:{at(*b)}", f"du:{at(*b)}", f"du:{at(*b)}")   # cliclick spaces each event ~0.1 s, enough for Unity's frame sampling


def shot():
    subprocess.run(["screencapture", "-x", f"-R{OX},{OY},1140,668", str(SHOT)]); return Image.open(SHOT).convert("L")


def ocr(path=SHOT): return json.loads(subprocess.run([str(FEZ / "ocr"), str(path)], capture_output=True, text=True).stdout or "[]")


def ocr_bright():
    """The night ledger draws unticked rows in dim grey that OCR skips: lift anything off the black before reading."""
    p = SHOT.with_name("papers-bright.png"); Image.open(SHOT).convert("L").point(lambda v: 255 if v > 45 else 0).save(p); return ocr(p)


CBOX = (0, 455, 356, 580)   # the counter between the entrant and the desk


def doc_on_counter(img, base):
    """Centre of whatever sits on the counter that was not there when it was empty, or None."""
    m = ImageChops.difference(img.crop(CBOX), base).point(lambda v: 255 if v > 40 else 0).getbbox()
    return ((m[0] + m[2]) // 2, CBOX[1] + (m[1] + m[3]) // 2) if m and (m[2] - m[0]) * (m[3] - m[1]) > 200 else None


DBOX, PARK = (360, 236, 1110, 668), (1000, 650)   # the desk; papers nobody takes back get parked bottom right
FACEBOX, FACE, BOOTH = (60, 250, 300, 445), None, None   # BOOTH: the window with nobody in it
SAID = []   # the entrant's spoken answers, read while the papers slide over: the bubbles are gone by decide time
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
        if re.search(r"CIT.{1,3}TION", w["t"].upper()): print("citation", [v["t"] for v in ws if abs(v["x"] - w["x"]) < 160 and 0 <= v["y"] - w["y"] < 200], flush=True)   # the reason line, for the next rule
        PENALTIES += any(re.search(r"ASSESS|CREDITS", v["t"].upper()) for v in ws)   # counted while the slip is fresh mid-desk, before it is parked
        if PENALTIES >= 6: raise SystemExit("six penalties: stop and replay the day")   # a full day still nets more than a replay; day.py refuses a night below zero
        drag((w["x"], min(w["y"] + 15, 650)), PARK); time.sleep(0.6)


def sweep(to, tries=6):
    """Drag everything new on the desk to `to` (the entrant, or the parking corner)."""
    tried = []
    for _ in range(tries):
        p = blob(shot(), EMPTY, DBOX, tried)
        if not p: return
        drag(p, to); tried.append(p); time.sleep(0.3)   # a paper that won't go stays put: try the next busiest spot


SPOTS = [(650, 400), (965, 380), (460, 600)]   # where each handed-over document goes on the desk


def at_booth(img):   # the counter strip is olive in the booth and black on the night screen
    return ImageStat.Stat(img.crop(CBOX)).mean[0] > 60 and not night()


def at_booth_face():   # someone is standing at the window: the face box is far from the dark empty booth wall
    return ImageStat.Stat(shot().crop(FACEBOX)).mean[0] > 50   # empty booth measures ~33


def night():   # the ledger is up: one stray click near SLEEP on a negative night is game over
    return any(re.search(r"SAVINGS|SLEEP|SALARY", w["t"].upper()) for w in ocr())


def entrant(day, base):
    global EMPTY, SAME, FACE
    if not at_booth(shot()): return None
    keep_gifts()   # the last citation goes to the corner
    for _ in range(3):   # a paper left on the counter by someone who has walked off (Calensk's envelope) is ours: park it
        img = shot(); left = doc_on_counter(img, base)
        if not left or BOOTH is None or ImageStat.Stat(ImageChops.difference(img.crop(FACEBOX), BOOTH)).mean[0] > 8: break   # only with nobody in the booth
        drag(left, PARK); time.sleep(0.3)
    time.sleep(0.4); EMPTY = shot().crop(DBOX)   # the desk as it is now is the baseline
    click(HORN)
    t0 = time.time()
    while not doc_on_counter(img := shot(), base):
        if not at_booth(img): return None
        if time.time() - t0 > 6 and any("NO DOCUMENTS" in w["t"].upper() for w in ocr()):   # Jorji on day 3: interrogate, he leaves
            missing_passport(); return "interrogated"
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
        while not (at_ := doc_on_counter(shot(), base)) and time.time() - t < 1.5: time.sleep(0.2)   # a slow passport is caught again in decide
        if not at_: break
        drag(at_, spot); spots.append(spot); time.sleep(0.3)
    global SAID; SAID = [w for w in ocr() if not (w["x"] > 360 and w["y"] > 236)]   # day 8 Cosmo Letski said a purpose his permit didn't
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
    for spot in reversed(spots):   # a permit is wider than a passport: lift it clear across the desk, not just nudge it (day 4 Emili Shinzinova)
        drag(spot, (spot[0] + 330 if spot[0] < 735 else spot[0] - 330, 330)); time.sleep(0.5); shot(); now = ocr()
        v = next((w for w in now if re.search(r"VISA|STAMP ?HE", w["t"].upper())), None)
        if v: return now + [w for w in words if not (abs(w["x"] - v["x"]) < 125 and -150 < w["y"] - v["y"] < 210)]
    return None


def decide(day, spots, base=None):
    """Read the desk, stamp the passport, hand every document back."""
    shot(); words = ocr() + SAID; v = verdict(words, day)
    if day >= 3 and not any(re.search(r"VISA|STAMP ?HE", w["t"].upper()) for w in words):
        keep_gifts()   # day 8 Lillian Lao: a citation printed late lay over her passport
        for y in (495, 530): drag((176, y), (965, 380)); time.sleep(0.4)   # day 4 Quinn Noxilova: a passport the counter check misses still comes with a blind grab
        shot(); words = ocr(); v = verdict(words, day)
        if any(re.search(r"VISA|STAMP ?HE", w["t"].upper()) for w in words): spots.append((965, 380)); return decide(day, spots, base)
        t, late = time.time(), None   # late, not missing: some entrants answer purpose and duration out loud before the passport comes over
        while base is not None and not (late := doc_on_counter(shot(), base)) and time.time() - t < 8: time.sleep(0.3)
        if late and len(spots) < 5:
            spot = (700, 560); drag(late, spot); spots.append(spot); time.sleep(0.6); return decide(day, spots, base)
        (HERE / "runs").mkdir(exist_ok=True); shot().save(HERE / "runs" / f"nopass-{time.strftime('%H%M%S')}.png")   # what it saw, for the next fix
        seen = reveal(spots, words)
        if seen: words = seen; v = verdict(words, day)
        elif day == 3 or not spots or SAME >= 1: missing_passport(); shot(); words = ocr(); v = "deny"   # no passport twice from the same face: really none, interrogate
        else: v = "deny"   # papers but no passport found: hand everything back rather than interrogate over a lost one
    visa = next((w for w in words if re.search(r"VISA|STAMP ?HE", w["t"].upper())), None)
    if visa:   # the passport: slide its visa box under the chosen stamp
        grab = (visa["x"], min(visa["y"] + 150, 580))   # a temporary visa slip sits low on the desk
        drop = (grab[0] + STAMP_X[v] - visa["x"], grab[1])
        drag(grab, drop); time.sleep(0.3)
        click(TRAY_OPEN); time.sleep(0.5); click((STAMP_X[v], 330)); time.sleep(0.5); click(TRAY_CLOSE); time.sleep(0.3)
        drag(drop, ENTRANT); time.sleep(0.3)
    def give_back():
        if EMPTY is None:
            for spot in spots: drag(spot, ENTRANT); time.sleep(0.5)
        else: keep_gifts(); sweep(ENTRANT)   # everything the entrant owns goes back; citations, ads and notes stay
    if night(): return v, []
    give_back(); time.sleep(0.5)
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
    EMPTY = shot().crop(DBOX); BOOTH = shot().crop(FACEBOX) if not at_booth_face() else None
    for n in range(int(sys.argv[2]) if len(sys.argv) > 2 else 80):
        r = entrant(day, base)
        print(n, r, flush=True)
        if r is None:   # only the ledger ends the day; a dark frame mid-day (day 8, after the EZIC card) is not the night
            for _ in range(10):
                if night(): break
                time.sleep(3)
                if at_booth(shot()): break
            if night(): break
    else: raise SystemExit("still in the booth after the cap")

"""Play Papers, Please days from screenshots: call the next entrant, read the passport, stamp, hand it back.
The game window must be in front: Unity only takes the real cursor (cliclick), not events posted to its pid.
Coordinates are window points, top-left of the content under the title bar included (same as the screenshot)."""
import datetime, difflib, json, re, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageChops

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


CBOX = (0, 455, 356, 580)   # the counter between the entrant and the desk


def doc_on_counter(img, base):
    """Centre of whatever sits on the counter that was not there when it was empty, or None."""
    m = ImageChops.difference(img.crop(CBOX), base).point(lambda v: 255 if v > 40 else 0).getbbox()
    return ((m[0] + m[2]) // 2, CBOX[1] + (m[1] + m[3]) // 2) if m and (m[2] - m[0]) * (m[3] - m[1]) > 200 else None


CITIES = {"ANTEGRIA": ["ST. MARMERO", "GLORIAN", "OUTER GROUSE"], "ARSTOTZKA": ["ORVECH VONOR", "EAST GRESTIN", "PARADIZNA"],
          "IMPOR": ["ENKYO", "HAIHAN", "TSUNKEIDO"], "KOLECHIA": ["YURKO CITY", "VEDOR", "WEST GRESTIN"],
          "OBRISTAN": ["SKAL", "LORNDAZ", "MERGEROUS"], "REPUBLIA": ["TRUE GLORIAN", "LESRENADI", "BOSTAN"],
          "UNITED FEDERATION": ["GREAT RAPID", "SHINGLETON", "KORISTA CITY"]}


def near(s, options, cut=0.75):
    m = difflib.get_close_matches(s, options, 1, cut); return m[0] if m else None


def passport(words):
    """Country, issuing city and expiry from the OCR of an open passport. OCR misreads ISS. as 155., so match loosely."""
    v = next((w for w in words if "VISA" in w["t"].replace(" ", "").upper()), None)
    inside = (lambda w: abs(w["x"] - v["x"]) < 150 and -150 < w["y"] - v["y"] < 210) if v else (lambda w: w["x"] > 360 and w["y"] > 236)
    toks = [w["t"].upper() for w in words if inside(w)]   # only the passport: a newspaper on the desk says "Grestin" too
    country = city = None
    for t in toks:
        country = country or near(t, list(CITIES)) or ("UNITED FEDERATION" if "FEDERATION" in t else None)
        bare = re.sub(r"^[^A-Z]*[A-Z0-9]{2,4}[.,]\s*", "", t) if re.match(r"^\S{3,4}[.,]\s", t) else t
        city = city or near(bare, [c for cs in CITIES.values() for c in cs], 0.8)
    dates = sorted(re.findall(r"(19\d\d)[.,\s](\d\d)[.,\s](\d\d)", " ".join(toks)))
    country = country or next((c for c, cs in CITIES.items() if city in cs), None)   # OCR can miss the country line
    return country, city, (".".join(dates[-1]) if dates else None)


def verdict(words, day):
    """Day 1: Arstotzkans only. Day 2 on: any known country, its own issuing city, not expired."""
    country, city, exp = passport(words)
    if day == 1: return "approve" if country == "ARSTOTZKA" else "deny"
    today = (datetime.date(1982, 11, 22) + datetime.timedelta(day)).strftime("%Y.%m.%d")
    ok = country and city in CITIES[country] and exp and exp > today
    if day >= 3 and country != "ARSTOTZKA":   # foreigners need an entry ticket valid on today's date
        text = " ".join(w["t"].upper() for w in words if w["x"] > 360 and w["y"] > 236)
        ok = ok and "TICKET" in text and today in re.sub(r"(19\d\d)[.,\s](\d\d)[.,\s](\d\d)", r"\1.\2.\3", text)
    return "approve" if ok else "deny"


SPOTS = [(650, 400), (990, 330), (990, 520)]   # where each handed-over document goes on the desk


def entrant(day):
    base = shot().crop(CBOX)
    click(HORN)
    t0 = time.time()
    while not doc_on_counter(shot(), base):
        if time.time() - t0 > 25: return None
        time.sleep(0.5)
    spots = []
    for spot in SPOTS:   # the entrant slides papers over one at a time
        time.sleep(1.0)
        at_ = doc_on_counter(shot(), base)
        if not at_: break
        drag(at_, spot); spots.append(spot); time.sleep(1.0)
    shot(); words = ocr(); v = verdict(words, day)
    visa = next((w for w in words if "VISA" in w["t"].replace(" ", "").upper()), None)
    if visa:   # the passport: slide its visa box under the chosen stamp
        grab = (visa["x"], visa["y"] + 150)
        drop = (grab[0] + STAMP_X[v] - visa["x"], grab[1])
        drag(grab, drop); time.sleep(0.5)
        click(TRAY_OPEN); time.sleep(1.0); click((STAMP_X[v], 330)); time.sleep(1.0); click(TRAY_CLOSE); time.sleep(0.8)
        drag(drop, ENTRANT); time.sleep(1.0)
    for spot in spots:   # everything else goes back too (the passport's old spot is empty by now)
        drag(spot, ENTRANT); time.sleep(1.0)
    time.sleep(2)
    return v, [w["t"] for w in words if w["x"] > 360 and w["y"] > 236]


def _check():
    w = lambda *ts: [{"t": t, "x": 700, "y": 400} for t in ts]
    assert passport([{"t": "At Grestin!", "x": 1000, "y": 300}, {"t": "ENTRY VISA", "x": 650, "y": 300}, {"t": "Lorndaz", "x": 700, "y": 400}])[:2] == ("OBRISTAN", "LORNDAZ")
    assert passport(w("155. Lesrenadi", "ENP. 1984.04.23", "REPUBLIA", "DOE. 1951.08.05")) == ("REPUBLIA", "LESRENADI", "1984.04.23")
    assert verdict(w("ISS. Haihan", "EXP 1983.11.23", "HMPOR", "1948.06.29"), 2) == "approve"
    assert verdict(w("ISS. Haihan", "EXP 1982.11.20", "IMPOR"), 2) == "deny"
    assert verdict(w("Tsunheido", "1984.02.03", "1955.12.30"), 2) == "approve"
    assert verdict(w("Mergeroue", "HP. 1983 08.23", "OBR"), 2) == "approve"
    assert verdict(w("Haihan", "1983.11.23", "IMPOR", "ENTRY TICKET", "1982.11.25"), 3) == "approve"
    assert verdict(w("Haihan", "1983.11.23", "IMPOR", "ENTRY TICKET", "1982.11.24"), 3) == "deny"
    assert verdict(w("Paradizna", "1983.11.23", "ARSTOTZKA"), 3) == "approve"
    assert verdict(w("ISS. Vedor", "EXP 1985.01.01", "IMPOR"), 2) == "deny"


if __name__ == "__main__":
    _check()
    day = int(sys.argv[1])
    for n in range(int(sys.argv[2]) if len(sys.argv) > 2 else 40):
        r = entrant(day)
        print(n, r, flush=True)
        if r is None: break

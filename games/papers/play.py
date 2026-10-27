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


DATE = r"(19\d\d)[.,\s](\d\d)[.,\s](\d\d)"
PNUM = r"\b[A-Z0-9]{5}[-_][A-Z0-9]{5}\b"


def split(words):
    """Passport tokens (inside the box around its ENTRY VISA label) and every other desk token, upper-cased."""
    v = next((w for w in words if re.search(r"VISA|STAMP ?HE", w["t"].upper())), None)   # fake passports say STAMP HERE
    inside = (lambda w: abs(w["x"] - v["x"]) < 125 and -150 < w["y"] - v["y"] < 210) if v else (lambda w: False)
    desk = [w for w in words if w["x"] > 360 and w["y"] > 236 and "DOCUMENTS" not in w["t"].upper()]
    return [w["t"].upper() for w in desk if inside(w)], [w["t"].upper() for w in desk if not inside(w)]


def passport(toks):
    """Country, issuing city, expiry, holder name and number. OCR misreads ISS. as 155., so match loosely."""
    country = city = name = None; best = 0
    for t in toks:
        country = country or near(t, list(CITIES)) or ("UNITED FEDERATION" if "FEDERATION" in t else None)
        bare = re.sub(r"^[^A-Z]*[A-Z0-9]{2,4}[.,]\s*", "", t) if re.match(r"^\S{3,4}[.,]\s", t) else t
        for c in [c for cs in CITIES.values() for c in cs]:   # the pixel font OCRs badly: keep the best city above 0.55
            r = difflib.SequenceMatcher(None, bare, c).ratio()
            if r > 0.55 and r > best: best, city = r, c
        name = name or (t if re.match(r"^[A-Z' -]+, [A-Z' -]+$", t) else None)
    dates = sorted(re.findall(DATE, " ".join(toks)))
    country = country or next((c for c, cs in CITIES.items() if city in cs), None)   # OCR can miss the country line
    num = next(iter(re.findall(PNUM, " ".join(toks))), None)
    return country, city, (".".join(dates[-1]) if dates else None), name, num


def same(a, b, cut=0.75): return bool(a and b) and difflib.SequenceMatcher(None, a, b).ratio() >= cut


def verdict(words, day):
    """Day 1: Arstotzkans only. Day 2: known country, its own issuing city, not expired. Day 3: foreigners bring an
    entry ticket for today. Day 4 on: citizens bring an ID card; foreigners an entry permit naming this passport."""
    mine, rest = split(words)
    country, city, exp, name, num = passport(mine)
    if day == 1: return "approve" if country == "ARSTOTZKA" else "deny"
    today = (datetime.date(1982, 11, 22) + datetime.timedelta(day)).strftime("%Y.%m.%d")
    ok = country and city in CITIES[country] and exp and exp > today
    text = re.sub(DATE, r"\1.\2.\3", " ".join(rest))
    if day == 3 and country != "ARSTOTZKA":
        ok = ok and "TICKET" in text and today in text
    if day >= 4 and country == "ARSTOTZKA":   # the ID card prints a district, height and weight; it may overlap the passport
        ok = ok and bool(re.search(r"IDENTITY|DISTRIC|\d\s?CM\b|\d\s?KG\b", " ".join(mine + rest)))
    if day >= 4 and country != "ARSTOTZKA":   # OCR mangles the pixel font: an unreadable field passes, a readable mismatch fails
        sur = next((m.group(1) for t in mine for m in [re.match(r"^([A-Z']{3,})[,.]", t)] if m), None)
        holder_ok = not sur or any(same(sur, wd, 0.6) for t in rest for wd in t.split())
        alnum = lambda s: re.sub(r"[^A-Z0-9]", "", s)
        pn = next((alnum(t) for t in mine if re.search(r"[A-Z0-9]{4,6}[-_][A-Z0-9-]{3,6}", t)), None)
        others = [alnum(t) for t in rest if re.search(r"[A-Z0-9]{4,6}[-_][A-Z0-9-]{3,6}", t)]
        num_ok = not pn or not others or any(same(pn, o, 0.6) for o in others)
        enter_by = max(re.findall(r"19\d\d\.\d\d\.\d\d", text) or ["0"])
        ok = ok and ("GRANTED" in text or "PERMIT" in text) and holder_ok and num_ok and enter_by >= today
    return "approve" if ok else "deny"


SPOTS = [(650, 400), (965, 380), (460, 600)]   # where each handed-over document goes on the desk


def entrant(day, base):
    click(HORN)
    t0 = time.time()
    while not doc_on_counter(shot(), base):
        if time.time() - t0 > 40: return None
        time.sleep(0.5)
    spots = []
    for spot in SPOTS:   # the entrant slides papers over one at a time
        time.sleep(1.0)
        at_ = doc_on_counter(shot(), base)
        if not at_: break
        drag(at_, spot); spots.append(spot); time.sleep(1.0)
    return decide(day, spots)


def missing_passport():
    """No passport: highlight the rule and the empty counter in inspect mode, then click the transcript printer to
    interrogate (the INTERROGATE label is only a hint). The entrant then hands over a temporary visa slip to deny on."""
    drag((253, 615), (450, 420)); time.sleep(1.2)   # rule book onto the desk; it opens where it was left
    shot(); ws = ocr()
    toc = next((w for w in ws if "BASIC" in w["t"].upper()), None)
    if toc: click((toc["x"], toc["y"])); time.sleep(1.2); shot(); ws = ocr()
    rule = next((w for w in ws if re.search(r"MU[SA]T HAVE", w["t"].upper())), None)
    if rule:
        click(INSPECT); time.sleep(1.0); click((rule["x"], rule["y"] + 8)); time.sleep(0.8)
        click((300, 550)); time.sleep(2.5); click(PRINTER); time.sleep(6)
    shot(); ws = ocr()
    book = next((w for w in ws if w["t"].upper() == "RULES"), None)
    if book: drag((book["x"], book["y"] + 10), (253, 615)); time.sleep(1.0)   # file the book again


def decide(day, spots):
    """Read the desk, stamp the passport, hand every document back."""
    shot(); words = ocr(); v = verdict(words, day)
    if day >= 3 and not any(re.search(r"VISA|STAMP ?HE", w["t"].upper()) for w in words):
        missing_passport(); shot(); words = ocr(); v = "deny"
    visa = next((w for w in words if re.search(r"VISA|STAMP ?HE", w["t"].upper())), None)
    if visa:   # the passport: slide its visa box under the chosen stamp
        grab = (visa["x"], visa["y"] + 150)
        drop = (grab[0] + STAMP_X[v] - visa["x"], grab[1])
        drag(grab, drop); time.sleep(0.5)
        click(TRAY_OPEN); time.sleep(0.7); click((STAMP_X[v], 330)); time.sleep(0.7); click(TRAY_CLOSE); time.sleep(0.5)
        drag(drop, ENTRANT); time.sleep(0.5)
    for spot in spots:   # everything else goes back too (the passport's old spot is empty by now)
        drag(spot, ENTRANT); time.sleep(0.5)
    time.sleep(1)
    return v, [w["t"] for w in words if w["x"] > 360 and w["y"] > 236]


def _check():
    w = lambda *ts: [{"t": "ENTRY VISA", "x": 700, "y": 300}] + [{"t": t, "x": 700, "y": 400} for t in ts]
    o = lambda *ts: [{"t": t, "x": 950, "y": 400} for t in ts]   # tokens on a second document
    assert passport(split([{"t": "At Grestin!", "x": 1000, "y": 300}, {"t": "ENTRY VISA", "x": 650, "y": 300}, {"t": "Lorndaz", "x": 700, "y": 400}])[0])[:2] == ("OBRISTAN", "LORNDAZ")
    assert passport(split(w("155. Lesrenadi", "ENP. 1984.04.23", "REPUBLIA", "DOE. 1951.08.05"))[0])[:3] == ("REPUBLIA", "LESRENADI", "1984.04.23")
    assert verdict(w("ISS. Haihan", "EXP 1983.11.23", "HMPOR", "1948.06.29"), 2) == "approve"
    assert verdict(w("ISS. Haihan", "EXP 1982.11.20", "IMPOR"), 2) == "deny"
    assert verdict(w("Tsunheido", "1984.02.03", "1955.12.30"), 2) == "approve"
    assert verdict(w("Mergeroue", "HP. 1983 08.23", "OBR"), 2) == "approve"
    assert verdict(w("Haihan", "1983.11.23", "IMPOR") + o("ENTRY TICKET", "1982.11.25"), 3) == "approve"
    assert verdict(w("Haihan", "1983.11.23", "IMPOR") + o("ENTRY TICKET", "1982.11.24"), 3) == "deny"
    assert verdict(w("Paradizna", "1983.11.23", "ARSTOTZKA"), 3) == "approve"
    kol = w("Claassens, Rikus", "_.KOLECHIA", "Pedor", "1983.04.09", "1T609-T0H48")
    permit = o("is hereby granted to", "RIRUS CLAASSENS", "1T609-T0H4R", "1982.12.08")
    assert verdict(kol + permit, 4) == "approve"
    assert verdict(kol + o("is hereby granted to", "MARTA KOWALSKA", "1T609-T0H4R", "1982.12.08"), 4) == "deny"
    assert verdict(kol + o("is hereby granted to", "RIRUS CLAASSENS", "AB123-CD456", "1982.12.08"), 4) == "deny"
    assert verdict(kol, 4) == "deny"
    vos = w("Vostok, Pyptr", "ANTEGRIA", "St. Marmerg", "1984.10.22", "P4SE7-FGOX6")
    assert verdict(vos + o("is hereby granted to", "PYOTR VOSTOH", "PLSED-FGG-6", "1982.12.21"), 5) == "approve"
    assert verdict(w("Gray. Edward", "ANTEGRIA", "St. Marmero", "1984.10.25", "R308L-SHL28") + o("granted", "EDHRO GRHY", "R308L-3KL28", "1982.12.11"), 5) == "approve"
    assert verdict(w("Paradizna", "1983.11.23", "ARSTOTZKA") + o("HEIGHT 170cm"), 4) == "approve"
    assert verdict(w("Paradizna", "1983.11.23", "ARSTOTZKA"), 4) == "deny"
    assert verdict(w("Bylund, Henrik", "SRSTOTZKA IDENTITY CARD", "179 cm", "Paradizna", "1984.04.38", "ARSTOTZHA"), 5) == "approve"
    assert passport(["ENHUO", "IMPOR"])[1] == "ENKYO" and passport(["JUFKO LITU"])[1] == "YURKO CITY"
    assert passport(["OBRISTAN", "TSUNKEIDO"])[:2] == ("OBRISTAN", "TSUNKEIDO")
    assert verdict([{"t": "STAMP HERE", "x": 700, "y": 300}, {"t": "COBRASTAN", "x": 700, "y": 400}], 4) == "deny"
    assert verdict(w("ISS. Vedor", "EXP 1985.01.01", "IMPOR"), 2) == "deny"


if __name__ == "__main__":
    _check()
    day = int(sys.argv[1])
    base = Image.open(HERE / '.counter.png') if (HERE / '.counter.png').exists() else shot().crop(CBOX)   # the empty counter
    base.save(HERE / '.counter.png')
    drag((745, 560), (105, 612)); time.sleep(1)   # file the day's bulletin so it stays out of the OCR
    for n in range(int(sys.argv[2]) if len(sys.argv) > 2 else 40):
        r = entrant(day, base)
        print(n, r, flush=True)
        if r is None: break

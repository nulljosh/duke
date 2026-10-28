"""What the booth rules say about one desk of papers: the OCR words in, approve or deny out. No game needed to test it."""
import datetime, difflib, re


KEEP = r"CIT.{1,3}TION|PROTOCOL|PENALTY|WARNING|PINK|FANTAS|НАН|BROTHEL|TRUST HI"   # citations, the Pink Vice ad, the note: ours to keep


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
        if near(t, list(CITIES)): continue   # the country line is not a city ("ANTEGRIA" is close to "GLORIAN")
        for c in [c for cs in CITIES.values() for c in cs]:   # the pixel font OCRs badly: keep the best city above 0.6
            r = difflib.SequenceMatcher(None, bare, c).ratio()
            if r >= 0.6 and r > best: best, city = r, c
        name = name or (t if re.match(r"^[A-Z' -]+, [A-Z' -]+$", t) else None)
    dates = sorted(d for d in re.findall(DATE, " ".join(toks)) if d[0] >= "1975")   # older dates are birthdays
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
    # deny only on readable evidence: the pixel font often garbles a valid city or date, and most entrants are valid
    ok = bool(country) and (city is None or city in CITIES[country]) and (exp is None or exp > today)
    text = re.sub(DATE, r"\1.\2.\3", " ".join(rest))
    if day == 3 and country != "ARSTOTZKA":
        ok = ok and "TICKET" in text and today in text
    if day >= 4 and country == "ARSTOTZKA":   # the ID card prints a district, height and weight; it may overlap the passport
        ok = ok and bool(re.search(r"IDENTITY|DISTRIC|\d\s?CM\b|\d\s?KG\b", " ".join(mine + rest)))
    if day >= 4 and country != "ARSTOTZKA":   # OCR mangles the pixel font: an unreadable field passes, a readable mismatch fails
        sur = next((m.group(1) for t in mine for m in [re.match(r"^([A-Z']{3,})[,.]\s+[A-Z]", t)] if m), None)
        holder_ok = not sur or any(same(sur, wd, 0.6) for t in rest for wd in t.split())
        alnum = lambda s: re.sub(r"[^A-Z0-9]", "", s)
        pn = next((alnum(t) for t in mine if re.search(r"[A-Z0-9]{4,6}[-_][A-Z0-9-]{3,6}", t)), None)
        others = [alnum(t) for t in rest if re.search(r"[A-Z0-9]{4,6}[-_][A-Z0-9-]{3,6}", t)]
        num_ok = not pn or not others or any(same(pn, o, 0.6) for o in others)
        enter_by = max(re.findall(r"19\d\d\.\d\d\.\d\d", text) or ["0"])
        ok = ok and ("GRANTED" in text or "PERMIT" in text) and holder_ok and num_ok and enter_by >= today
    if day == 7 and country == "KOLECHIA": ok = False   # search every Kolechian; denying unsearched costs no citation (ponytail: no scanner yet)
    if day >= 6 and any(re.fullmatch(r"WOR[KH]", t) for t in rest):   # purpose WORK needs the Ministry of Labor's work pass
        ok = ok and bool(re.search(r"LAB[OE]R|HOLDER|FIELD", text))   # ponytail: name and work-until vs duration not checked yet
    return "approve" if ok else "deny"



def _check():
    assert all(re.search(KEEP, t.upper()) for t in ("M.O.H. CITHTION", "The Pink", "А нан наннеа Далі"))
    assert not any(re.search(KEEP, t.upper()) for t in ("ENTRY VISA", "Ludum, Dari", "Minirtry of Laber"))
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
    pyotr = w("ANTEGRIA", "DDE. 1945.10.21", "Touse", "984.00", "Vostok, Pyptı", "DR90N-DAP6C")
    assert verdict(pyotr + o("is hereby granted to", "PYOTR VOSTOH", "DR90N-DHP6C", "1982.12.15"), 5) == "approve"
    assert verdict(w("STAMP HERE", "COBRASTAN", "1923.5.31", "Festbun"), 5) == "deny"
    assert verdict(w("ISS. Vedor", "EXP 1985.01.01", "IMPOR"), 2) == "deny"
    kov = w("ANTEGRIA", "1944.11.27", "St. Marmero", "1983.09.20") + o("is hereby granted to", "ODAH HOVARS", "FP931-H375V", "Purpose", "WORH", "1 MONTH", "1982.12.22")
    assert verdict(kov + o("Minirtry ef Laber", "prk Pass", "HOLDER", "FIELD"), 6) == "approve"
    assert verdict(kov, 6) == "deny" and verdict(kov, 5) == "approve"
    assert verdict(kol + permit, 7) == "deny" and verdict(kol + permit, 8) == "approve"



if __name__ == "__main__":
    _check(); print("ok")

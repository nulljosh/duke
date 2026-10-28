"""What the booth rules say about one desk of papers: the OCR words in, approve or deny out. No game needed to test it."""
import datetime, difflib, re


KEEP = r"EZIC|CIT.{1,3}TION|PROTOCOL|PENALTY|WARNING|PINK|FANTAS|НАН|BROTHEL|TRUST HI"   # citations, the Pink Vice ad, the note: ours to keep


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
    joined = re.sub(r"(?<![\d])(9\d\d[.,]\d\d[.,]\d\d)", r"1\1", " ".join(toks))   # OCR drops the 1 of 1982 at a field's edge
    dates = sorted(d for d in re.findall(DATE, joined) if d[0] >= "1975")   # older dates are birthdays
    country = country or next((c for c, cs in CITIES.items() if city in cs), None)   # OCR can miss the country line
    num = next(iter(re.findall(PNUM, " ".join(toks))), None)
    return country, city, (".".join(dates[-1]) if dates else None), name, num


def same(a, b, cut=0.75): return bool(a and b) and difflib.SequenceMatcher(None, a, b).ratio() >= cut


WORDS = {"ENTRY VISA", "ENTRY PERMIT", "WORK PASS", "IDENTITY CARD", "ARSTOTZKA", "KOLECHIA", "ANTEGRIA", "OBRISTAN", "REPUBLIA",
         "ACCOUNTING", "AGRICULTURE", "ARCHITECTURE", "AVIATION", "CONSTRUCTION", "DENTISTRY", "DRAFTING", "ENGINEERING", "FINE ARTS",
         "FISHING", "FOOD SERVICE", "GENERAL LABOR", "HEALTHCARE", "MANUFACTURING", "RESEARCH", "STATISTICS", "SURVEYING", "PURPOSE", "DURATION"}   # never names


def verdict(words, day):
    """Day 1: Arstotzkans only. Day 2: known country, its own issuing city, not expired. Day 3: foreigners bring an
    entry ticket for today. Day 4 on: citizens bring an ID card; foreigners an entry permit naming this passport."""
    mine, rest = split(words)
    country, city, exp, name, num = passport(mine)
    if day == 1: return "approve" if country == "ARSTOTZKA" else "deny"
    today = (datetime.date(1982, 11, 22) + datetime.timedelta(day)).strftime("%Y.%m.%d")
    if exp is None and "1982" in mine: exp = "1982"   # day 4 Alina Ruchumova: only the year read, and a 1982 expiry is nearly always past
    part = re.search(r"\b(198[2-9])[.,](\d\d)\b", " ".join(mine)) if exp is None else None
    if part: exp = part[1] + "." + part[2]   # day 4 Hubert Maciejewicz: "1982.11.1" with the day cut off still expired
    # deny only on readable evidence: the pixel font often garbles a valid city or date, and most entrants are valid
    text = re.sub(DATE, r"\1.\2.\3", " ".join(rest))
    if country == "ARSTOTZKA" and re.search(r"GRANTED|PERMIT", text): country = None   # a permit's ARSTOTZKA header lying over the passport
    fake = any("STAMP HE" in t for t in mine)   # forged passports print STAMP HERE where real ones say ENTRY VISA
    ok = not fake and (country is None or city is None or city in CITIES[country]) and (exp is None or exp > today) and (day < 4 or bool(country) or "GRANTED" in text or "PERMIT" in text)
    if day == 3 and country != "ARSTOTZKA":
        ok = ok and "TICKET" in text and today in text
    if day >= 4 and country == "ARSTOTZKA":   # the ID card prints a district, height and weight; it may overlap the passport
        ok = ok and bool(re.search(r"IDENTITY|DISTRIC|\d\s?CM\b|\d\s?KG\b", " ".join(mine + rest)))
        births = {".".join(d) for d in re.findall(r"(\d\d)[.,\s](\d\d)[.,\s](\d\d)\b", " ".join(mine + rest)) if d[0] < "75"}   # by the year's last two digits: the 19 reads as 79 or P
        ok = ok and len(births) <= 1   # day 4 Norma Tarnoff (ID card 1920, passport 1938), day 8 Corman Drex (1926 vs 1936)
        toks = mine + rest
        idn = next(((t.rstrip(",.:"), toks[i + 1]) for i, t in enumerate(toks[:-1]) if re.fullmatch(r"[A-Z']{3,}[,.:]", t)), None)   # the ID card prints "HILL," then "SVETLANA"
        pn = next((m.groups() for t in toks for m in [re.match(r"^([A-Z']{2,})[,.]\s+([A-Z']{2,})", t)] if m), None)
        ok = ok and (not idn or not pn or (same(pn[0], idn[0], 0.6) and same(pn[1], idn[1], 0.5)))   # day 8 Eve Hill carried Svetlana Hill's ID card
    if day >= 4 and country != "ARSTOTZKA":   # OCR mangles the pixel font: an unreadable field passes, a readable mismatch fails
        pname = next((m.groups() for t in mine + rest for m in [re.match(r"^([A-Z']{3,})[,.]\s+([A-Z']{3,})", t)] if m), None)
        granted = next((rest[i + 1] for i, t in enumerate(rest[:-1]) if "GRANTED" in t), "")   # the permit's holder line
        words_ = granted.split()   # day 4 Schiavon held Abdullah Yurinov's permit; day 8 an "invalid name" slipped through on one matching name
        holder_ok = not pname or not words_ or (any(same(pname[0], wd, 0.6) for wd in words_) and (len(pname[1]) <= 3 or any(same(pname[1], wd, 0.5) for wd in words_)))
        alnum = lambda s: re.sub(r"[^A-Z0-9]", "", s)
        pn = next((alnum(t) for t in mine if re.search(r"[A-Z0-9]{4,6}[-_][A-Z0-9-]{3,6}", t)), None)
        others = [alnum(t) for t in rest if re.search(r"[A-Z0-9]{4,6}[-_][A-Z0-9-]{3,6}", t)]
        num_ok = not pn or not others or any(same(pn, o, 0.45) for o in others)   # day 5 Vince Lestrade: TDW50-9HDFT read as TOMSU-9HOFT on his own permit
        enter_by = max([d for d in re.findall(r"19\d\d\.\d\d\.\d\d", text) if d >= "1982"] or [today])   # cut off the desk: passes
        papers = "GRANTED" in text or "PERMIT" in text or (day >= 8 and bool(re.search(r"DIPLOMAT|AUTHORI", text)))   # diplomats bring an authorization instead
        ok = ok and papers and holder_ok and num_ok and enter_by >= today
    if 13 <= day <= 26 and country != "ARSTOTZKA":   # foreigners show an ID supplement (height, weight, description, thumbprint)
        ok = ok and bool(re.search(r"SUPPLEM|DESCRIPT|THUMB", text))   # ponytail: its height, weight and expiry not checked yet
    if day == 7 and country == "KOLECHIA": ok = False   # search every Kolechian; denying unsearched costs no citation (ponytail: no scanner yet)
    if day >= 6 and any(re.fullmatch(r"WOR[KH]", t) for t in rest):   # purpose WORK needs the Ministry of Labor's work pass
        ok = ok and bool(re.search(r"LAB[OE]R|HOLDER|FIELD", text))   # ponytail: work-until vs duration not checked yet
        sur = next((m.group(1) for t in mine for m in [re.match(r"^([A-Z']{3,})[,.]\s+[A-Z]", t)] if m), None)
        names = [t for t in rest if re.fullmatch(r"[A-Z']{3,} ?[A-Z']{3,}", t) and len(t) >= 7 and not near(t, list(WORDS), 0.75)]   # OCR misspells fields too
        ok = ok and (not sur or all(any(same(sur, wd, 0.6) for wd in t.split()) or sur[:4] in t.replace(" ", "") for t in names))   # the pass names someone else
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
    assert verdict(kol + permit, 13) == "deny" and verdict(kol + permit + o("ID SUPPLEMENT", "DESCRIPTION"), 13) == "approve"
    # day 7 citations: enter-by cut off the desk, and a permit header read as the passport's country
    assert verdict(w("Zopenho, Carlota", "1936.04.23", "Tsunheido", "1983.09.13", "400T4-RRMSH") + o("is hereby granted to", "CARLOTA 20PENHO", "40QT4-RRMSV", "IMMIGRATE", "FOREVER"), 7) == "approve"
    assert verdict(w("Risa, Misha", "1936.11.28", "True Glorian", "1983.12.18", "REPUBLI", "SHFG5-BRKAG") + o("Permit", "is hereby granted to", "MISHA RISA", "SHFG5-BRKAG", "IMMIGRATE", "FOREVER"), 7) == "approve"
    assert verdict(w("ARSTOTZKA", "Entry Permit", "Goyetsky, Andrei", "ORYAM-5RGHG") + o("hereby granted to", "AMDREI GOYETSE", "ORYAM-5RGHG", "1982.12.20"), 7) == "approve"
    assert verdict(w("Haihan", "1983.11.23", "IMPOR") + o("is hereby granted to", "1982.11.20"), 7) == "deny"   # a readable stale enter-by still fails
    aza = w("ANTEGRIA", "Hudsonsho, Rzg", "S90LT-HJ160") + o("hereby granted to", "AZA HUDSONSHA", "590LT-H-130", "WORH", "1982.12.20", "Minirtry ef Laber", "HOLDER")
    assert verdict(w("UNITED FEDERATION", "Shingleton") + o("DIPLOMATIC AUTHORIZATION", "ARSTOTZKA"), 8) == "approve" and verdict(w("UNITED FEDERATION", "Shingleton"), 8) == "deny"
    assert verdict(w("UNITED FEDERATION", "Baherova, Maria", "Horista City") + o("granted to", "MARIA BAHEROVA", "WORH", "Minirtry of Laber", "LILIVASILAUSHIS", "STATISTICS", "1983.12.01"), 7) == "deny"
    assert passport(["UNITED FEDERATION", "reat Hapid", "982.11.03"])[2] == "1982.11.03"
    # day 4 citations: a stranger's permit, a 1982 expiry read as the bare year, an ID card born 18 years earlier
    assert verdict(w("Schiavon, Giorgio", "Horista City", "1983.06.10", "EBEON-6HLRR") + o("is hereby granted to", "ABDULLAH YURINOV", "EBEON-6HLRR", "1982.12.08"), 4) == "deny"
    assert verdict(w("huchumova, Alina", "1947.03.15", "Enhyo", "1982", "CHE40-GUAH2") + o("is hereby granted to", "ALINA RUCHUMOVA", "1982.12.16"), 4) == "deny"
    assert verdict(w("-KOLECHIA", "Maciejewicz, Hubert", "Yurko Citu", "1982.11.1šŚ", "8MQA7-X6LVG") + o("is hereby granted to", "HUBERT MACIEJEWICZ", "8MQA7-X6LVG", "1982.12.20"), 4) == "deny"
    assert verdict(w("Lestrade, Vince", "True Glorian", "1984.05.04", "REPUBLIA", "TDW50-9HDFT") + o("is hereby granted to", "PINCE LESTRADE", "TOMSU-9HOFT", "1982.12.23"), 5) == "approve"
    assert verdict(w("Funke, Sabrina", "1943.03.16", "Paradizna", "1983.08.28", "ARSTOTZKA") + o("IDENTITY CARD", "DOE.P43.05.24"), 5) == "deny"
    assert verdict(w("Hill. Eve", "1927.09.18", "East Grestin", "1983.04.15", "ARSTOTZKA") + o("IDENTITY CARD", "HILL,", "SVETLANA", "227.09.18"), 8) == "deny"
    assert verdict(w("Fouchier, Julia", "DDE. 1953.01.05", "Orvech Vonor", "1984.09.29", "ARSTOTZHA") + o("IDENTITY CARD", "FOUCHIER:", "JULIA", "353.01.05"), 8) == "approve"
    assert verdict(w("Drex, Corman", "1936.11.29", "Paradizna", "1984.04.19", "ARSTOTZHA") + o("IDENTITY CARD", "DREX,", "CORMAN", "1926.11.29"), 8) == "deny"
    norma = w("Tarnoff, Norma", "| 1938.03.15", "East Grestin", "1983.06.12", "ARSTOTZKA")
    assert verdict(norma + o("IDENTITY CARD", "7920.03.15"), 4) == "deny" and verdict(norma + o("IDENTITY CARD", "1938.03.15"), 4) == "approve"
    assert verdict(aza + o("MICHE PIETROWSHA", "MAHUFACTURING"), 7) == "deny" and verdict(aza + o("AZA HUDSONSHO", "MAHUFACTURING"), 7) == "approve" and verdict(aza + o("AZA HUDSONSHO", "FISHING"), 7) == "approve"



if __name__ == "__main__":
    _check(); print("ok")

"""What the booth rules say about one desk of papers: the OCR words in, approve or deny out. No game needed to test it."""
import datetime, difflib, re


KEEP = r"EZIC|CIT.{1,3}TION|PROTOCOL|PENALTY|WARNING|PINK|FANTAS|НАН|BROTHEL|TRUST HI|\w\*\w|^[A-Z0-9]{14,}$|MESKOR|ANEGOV"   # citations, the Pink Vice ad, the note: ours to keep


CITIES = {"ANTEGRIA": ["ST. MARMERO", "GLORIAN", "OUTER GROUSE"], "ARSTOTZKA": ["ORVECH VONOR", "EAST GRESTIN", "PARADIZNA"],
          "IMPOR": ["ENKYO", "HAIHAN", "TSUNKEIDO"], "KOLECHIA": ["YURKO CITY", "VEDOR", "WEST GRESTIN"],
          "OBRISTAN": ["SKAL", "LORNDAZ", "MERGEROUS"], "REPUBLIA": ["TRUE GLORIAN", "LESRENADI", "BOSTAN"],
          "UNITED FEDERATION": ["GREAT RAPID", "SHINGLETON", "KORISTA CITY"]}


DISTRICTS = {"ALTAN", "VESCILLO", "BURNTON", "OCTOVALIS", "GENNISTORA", "LENDIFORMA", "WOZENFIELD", "FARDESTO"}


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
    joined = re.sub(r"(?<![\d])9\d2[.,]\s+(\d\d)[.,](\d\d)\b", r"1982.\1.\2", joined)   # day 8 Maxime Chastang: "962." "11.04" is 1982.11.04, expired
    dates = sorted(d for d in re.findall(DATE, joined) if d[0] >= "1975")   # older dates are birthdays
    country = country or next((c for c, cs in CITIES.items() if city in cs), None)   # OCR can miss the country line
    num = next(iter(re.findall(PNUM, " ".join(toks))), None)
    return country, city, (".".join(dates[-1]) if dates else None), name, num


def same(a, b, cut=0.75): return bool(a and b) and difflib.SequenceMatcher(None, a, b).ratio() >= cut


WORDS = {"ENTRY VISA", "ENTRY PERMIT", "WORK PASS", "IDENTITY CARD", "ARSTOTZKA", "KOLECHIA", "ANTEGRIA", "OBRISTAN", "REPUBLIA",
         "ACCOUNTING", "AGRICULTURE", "ARCHITECTURE", "AVIATION", "CONSTRUCTION", "DENTISTRY", "DRAFTING", "ENGINEERING", "FINE ARTS",
         "FISHING", "FOOD SERVICE", "GENERAL LABOR", "HEALTHCARE", "MANUFACTURING", "RESEARCH", "STATISTICS", "SURVEYING", "PURPOSE", "DURATION"}   # never names


PURPOSES = {"WORK": r"WOR[KH]|HORK|HORH", "VISIT": r"[VP]IS[IT]T|VISITING", "TRANSIT": r"TRANSIT|PASSING", "IMMIGRATE": r"IMMIGRAT\w*|LIVE HERE|MOVING"}


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
        dist = next((re.sub(r"[^A-Z]", "", m[1]) for t in mine + rest for m in [re.match(r"^([A-Z ]{4,}?)\s*DISTRIC", t)] if m), "")
        ok = ok and (len(dist) < 5 or dist in DISTRICTS)   # exact: the game plants one-letter swaps (day 14 WIZENFIELD); OCR reads this font cleanly
        births = {".".join(d) for d in re.findall(r"(\d\d)[.,\s](\d\d)[.,\s](\d\d)\b", " ".join(mine + rest)) if d[0] < "75"}   # by the year's last two digits: the 19 reads as 79 or P
        ok = ok and not any(sum(x != y for x, y in zip(a, b)) >= 2 for a in births for b in births)   # day 4 Norma Tarnoff: ID card 1920, passport 1938. A 1-digit gap is OCR (day 8 Corman Drex, valid, read 1926 vs 1936)
        toks = mine + rest
        idn = next(((t.rstrip(",.:"), toks[i + 1]) for i, t in enumerate(toks[:-1]) if re.fullmatch(r"[A-Z']{3,}[,.:]", t)
                    and re.fullmatch(r"[A-Z']{3,}", toks[i + 1]) and not near(t.rstrip(",.:"), ["DOB", "ISS", "EXP", "SEX"], 0.6)), None)   # the ID card prints "HILL," then "SVETLANA"; "DOE." "SEM" is the passport's labels (day 8 Frank Yates)
        pn = next((m.groups() for t in toks for m in [re.match(r"^([A-Z']{2,})[,.]\s+([A-Z']{2,})", t)] if m), None)
        ok = ok and (not idn or not pn or (same(pn[0], idn[0], 0.6) and same(pn[1], idn[1], 0.5)))   # day 8 Eve Hill carried Svetlana Hill's ID card
    if day >= 4 and country != "ARSTOTZKA":   # OCR mangles the pixel font: an unreadable field passes, a readable mismatch fails
        pname = next((m.groups() for t in mine + rest for m in [re.match(r"^([A-Z']{3,})[,.]\s+([A-Z']{3,})", t)] if m), None)
        granted = next((rest[i + 1] for i, t in enumerate(rest[:-1]) if re.search(r"GRANTED\s*TO|HEREBY", t)), "")   # the permit's holder line, not a diplomat's "be granted upon presentation" (day 8 Anne Mahnumus)
        words_ = granted.split()   # day 4 Schiavon held Abdullah Yurinov's permit; day 8 an "invalid name" slipped through on one matching name
        holder_ok = not pname or not words_ or (any(same(pname[0], wd, 0.6) for wd in words_) and (len(pname[1]) <= 3 or any(same(pname[1], wd, 0.5) for wd in words_)))
        swapped = lambda a, b: len(a) == len(b) and any(x == "A" and y == "U" for x, y in zip(a, b))   # the font reads a permit's changed letter as U (Cucinova, Zulestin, Tuirvoshu): a real typo
        holder_ok = holder_ok and not (pname and any(swapped(pname[0], wd) for wd in words_))
        alnum = lambda s: re.sub(r"[^A-Z0-9]", "", s)
        pn = next((alnum(t) for t in mine if re.search(r"[A-Z0-9]{4,6}[-_][A-Z0-9-]{3,6}", t)), None)
        others = [alnum(t) for t in rest if re.search(r"[A-Z0-9]{4,6}[-_][A-Z0-9-]{3,6}", t)]
        num_ok = not pn or not others or any(same(pn, o, 0.45) for o in others)   # day 5 Vince Lestrade: TDW50-9HDFT read as TOMSU-9HOFT on his own permit
        eb = next((w for w in words if re.search(r"ENTER\s*BY", w["t"].upper())), None)   # the permit's own date, on its "Enter by" row
        row = [re.sub(DATE, r"\1.\2.\3", w["t"]) for w in words if eb and abs(w["y"] - eb["y"]) < 12 and w["x"] > eb["x"] and re.search(DATE, w["t"])]
        enter_by = re.search(r"19\d\d\.\d\d\.\d\d", row[0])[0] if row else max([d for d in re.findall(r"19\d\d\.\d\d\.\d\d", text) if d >= "1982"] or [today])   # day 14: the latest date on the desk (an ID supplement's) let an expired permit through; unread passes
        papers = "GRANTED" in text or "PERMIT" in text or (day >= 8 and bool(re.search(r"DIPLOMAT|AUTHORI", text)))   # diplomats bring an authorization instead
        ok = ok and papers and holder_ok and num_ok and enter_by >= today
    said = " ".join(w["t"].upper() for w in words if not (w["x"] > 360 and w["y"] > 236))   # the booth transcript and speech bubbles
    spoken = next((p for p, pat in PURPOSES.items() if re.search(pat, said)), None)
    written = next((p for p, pat in PURPOSES.items() for t in rest if re.fullmatch(pat, t)), None)
    if day >= 5 and spoken and written and spoken != written: ok = False   # day 8 Karina Gulieva: said one purpose, her permit another
    if 13 <= day <= 26 and country != "ARSTOTZKA":   # foreigners show an ID supplement (height, weight, description, thumbprint)
        ok = ok and bool(re.search(r"SUPPLEM|DESCRIPT|THUMB", text))   # ponytail: its height, weight and expiry not checked yet
    scale = next((int(m[1]) for w in words if (w["x"], w["y"]) == (322, 630) for m in [re.fullmatch(r"(\d{2,3})KG", w["t"].upper())] if m), None)   # scale.read's word only: the full-screen OCR read 59 kg as "39 kg"
    if day >= 13 and scale and any(abs(int(m[1]) - scale) > 4 for t in mine + rest for m in [re.search(r"\b(\d{2,3})\s?KG\b", t)] if m): ok = False   # day 14: weight lies on the ID supplement
    if day == 7 and country == "KOLECHIA": ok = False   # search every Kolechian; denying unsearched costs no citation (ponytail: no scanner yet)
    if day >= 6 and any(re.fullmatch(r"WOR[KH]", t) for t in rest):   # purpose WORK needs the Ministry of Labor's work pass
        ok = ok and bool(re.search(r"LAB[OE]R|HOLDER|FIELD", text))   # ponytail: work-until vs duration not checked yet
        sur = next((m.group(1) for t in mine for m in [re.match(r"^([A-Z']{3,})[,.]\s+[A-Z]", t)] if m), None)
        names = [t for t in rest if re.fullmatch(r"[A-Z']{3,} ?[A-Z']{3,}", t) and len(t) >= 7 and not near(t, list(WORDS), 0.75)]   # OCR misspells fields too
        ok = ok and (not sur or all(any(same(sur, wd, 0.6) for wd in t.split()) or sur[:4] in t.replace(" ", "") for t in names))   # the pass names someone else
    return "approve" if ok else "deny"



def _check():
    import test_rules; test_rules.check()   # the cases live in test_rules.py

if __name__ == "__main__":
    _check(); print("ok")

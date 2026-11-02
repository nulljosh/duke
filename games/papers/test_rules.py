"""Self-checks for rules.py: OCR word lists from real desks, the verdict they must get."""
import re
from rules import *   # noqa: F403
from rules import split, passport, verdict, KEEP


def check():
    assert all(re.search(KEEP, t.upper()) for t in ("M.O.H. CITHTION", "The Pink", "А нан наннеа Далі", "PPC*ER3THCJBOA", "PNSMA51IKU7P6AMB90LMDF"))   # Drex's cipher stays ours
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
    scl = lambda kg: w("Paradizna", "1983.11.23", "ARSTOTZKA") + o("HEIGHT 170cm", "WT 79kg") + [{"t": kg, "x": 322, "y": 630}]
    assert verdict(scl("79kg"), 14) == "approve" and verdict(scl("92kg"), 14) == "deny"
    assert verdict(w("Paradizna", "1983.11.23", "ARSTOTZKA") + o("WIZENFIELD DISTRICT", "HEIGHT 170cm"), 4) == "deny"
    assert verdict(w("Paradizna", "1983.11.23", "ARSTOTZKA") + o("GENNISTOR A DISTRICT", "HEIGHT 170cm"), 4) == "approve"
    eb = lambda d: kol + permit + [{"t": "Enter by", "x": 880, "y": 520}, {"t": d, "x": 1010, "y": 522}, {"t": "1983.01.20", "x": 950, "y": 600}]
    assert verdict(eb("1982.11.20"), 4) == "deny" and verdict(eb("1982.12.30"), 4) == "approve"   # day 14: the supplement's later date must not count
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
    assert verdict(w("Drex, Corman", "1945.02.10", "Paradizna", "1984.06.08", "ARSTOTZHA") + o("IDENTITY CARD", "DREX,", "CORMANI", "845.03.10"), 8) == "approve"
    kar = w("UNITED FEDERATION", "Gulieva, Karina", "Great Rapid", "1983.10.25", "600JL-DFSHG") + o("hereby granted to", "KARINA GULIEVA", "600JL-DFSHG", "WORK", "1982.12.20", "Minirtry of Laber", "HOLDER", "KARINA GULIEVA")
    assert verdict(kar, 8) == "approve" and verdict(kar + [{"t": "I am here to visit.", "x": 150, "y": 120}], 8) == "deny" and verdict(kar + [{"t": "I plan to Horh.", "x": 150, "y": 120}], 8) == "approve"
    assert verdict(w("Yates, Frank", "DOE.", "SEM", "1943.03.19", "Paradizna", "1984.08.06", "ARSTOTZHA") + o("IDENTITY CARD", "YATES,", "FRANK", "943.03.19"), 8) == "approve"
    assert verdict(w("-KOLECHIA", "Mahnumus, Anne", "Wlest Grestin", "1984.11.16", "POPRS-PRHGU") + o("Authorization", "diplomatic entity", "ANNE HAHHUMUS", "be granted upon presentation.", "ARSTOTZHA, HOLECHIA,"), 8) == "approve"
    assert verdict(w("ANTEGRIA", "Outer Grouse", "962.", "11.04", "Chastang, Maxime", "0JU6T-CT8R0") + o("is hereby granted to", "MARIME CHASTANG", "8 U6T-CT8RG", "1982.12.14"), 8) == "deny"
    assert verdict(w("Tuirvoska, Lumina", "Shingleton", "1983.08.09", "FL404-05C4C") + o("is hereby granted to", "LUMINA TUIRVOSHU", "FL4 14-05C40", "1982.12.17"), 8) == "deny"
    norma = w("Tarnoff, Norma", "| 1938.03.15", "East Grestin", "1983.06.12", "ARSTOTZKA")
    assert verdict(norma + o("IDENTITY CARD", "7920.03.15"), 4) == "deny" and verdict(norma + o("IDENTITY CARD", "1938.03.15"), 4) == "approve"
    assert verdict(aza + o("MICHE PIETROWSHA", "MAHUFACTURING"), 7) == "deny" and verdict(aza + o("AZA HUDSONSHO", "MAHUFACTURING"), 7) == "approve" and verdict(aza + o("AZA HUDSONSHO", "FISHING"), 7) == "approve"


if __name__ == "__main__":
    check(); print("rules ok")

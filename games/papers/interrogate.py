"""No passport on the desk: highlight the rule against the empty counter, then interrogate for the visa slip."""
import re, sys, time


def missing_passport():
    """No passport: highlight the rule and the empty counter in inspect mode, then click the transcript printer to
    interrogate (the INTERROGATE label is only a hint). The entrant then hands over a temporary visa slip to deny on."""
    p = sys.modules.get("play") or sys.modules["__main__"]
    p.drag((253, 615), (730, 420)); time.sleep(1.2)   # rule book onto the desk, far enough right to read both pages
    p.shot(); ws = p.ocr()
    toc = next((w for w in ws if "BASIC" in w["t"].upper()), None)
    if toc: p.click((toc["x"], toc["y"])); time.sleep(1.2); p.shot(); ws = p.ocr()
    rule = next((w for w in ws if re.search(r"MU[SA]T HAVE", w["t"].upper())), None)
    if rule:
        p.click(p.INSPECT); time.sleep(1.0); p.click((rule["x"], rule["y"] + 8)); time.sleep(0.8)
        p.click((300, 550)); time.sleep(2.5); p.click(p.PRINTER); time.sleep(6)
    p.shot(); ws = p.ocr()
    if any("HIGHLIGHT" in w["t"].upper() for w in ws): p.click(p.INSPECT); time.sleep(1.0); p.shot(); ws = p.ocr()   # papers don't move in inspect mode
    book = next((w for w in ws if w["t"].upper() == "RULES"), None)
    if book: p.drag((book["x"], book["y"] + 10), (253, 615)); time.sleep(1.0)   # file the book again

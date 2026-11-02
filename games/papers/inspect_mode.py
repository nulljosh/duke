"""Let the game judge what OCR can't: in inspect mode, click a field, then what it should match (the entrant's
face, the scale); the game prints MATCHING DATA at the link's midpoint when they agree. Measured day 14 by hand:
description vs face and weight vs scale both read "MATCHING DATA". Anything else is saved, to learn the label."""
import re, sys, time

FACE, SCALE = (180, 345), (322, 630)


def _p(): return sys.modules.get("play") or sys.modules["__main__"]


def pairs(words):
    """The supplement or ID card fields worth a check before an approval: height and description against the face,
    weight against the scale."""
    desk = [w for w in words if w["x"] > 360 and w["y"] > 236]
    out = []
    ht = next((w for w in desk if re.fullmatch(r"\d{3}\s?CM", w["t"].upper())), None)
    if ht: out.append(("height", (ht["x"], ht["y"]), FACE))
    wt = next((w for w in desk if re.fullmatch(r"\d{2,3}\s?KG", w["t"].upper())), None)
    if wt: out.append(("weight", (wt["x"], wt["y"]), SCALE))
    d = next((w for w in desk if re.search(r"DES[CS]R", w["t"].upper())), None)
    val = d and next((w for w in desk if 10 < w["y"] - d["y"] < 40 and abs(w["x"] - d["x"]) < 80), None)
    if val: out.append(("description", (val["x"], val["y"]), FACE))
    return out


def check(words):
    """None when every pair matches, else the name of the first that didn't."""
    p, todo = _p(), pairs(words)
    if not todo: return None
    p.click(p.INSPECT); time.sleep(0.8)
    bad = None
    for name, a, b in todo:
        p.click(a); time.sleep(0.5); p.click(b); time.sleep(1.0)
        p.shot(); ws = p.ocr()
        if not any("MATCH" in w["t"].upper() for w in ws):
            (p.HERE / "runs").mkdir(exist_ok=True); p.shot().save(p.HERE / "runs" / f"inspect-{name}-{time.strftime('%H%M%S')}.png")
            bad = name; print("inspect", name, [w["t"] for w in ws if 250 < w["y"] < 640 and 360 < w["x"] < 900][:8], flush=True)
            break
    p.click(p.INSPECT); time.sleep(0.8)
    if any("HIGHLIGHT" in w["t"].upper() for w in p.ocr()): p.click(p.INSPECT); time.sleep(0.8)   # still in: one more toggle
    return bad

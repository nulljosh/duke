"""The bulletin's three wanted faces (day 14 on), scored against each entrant's booth face and passport photo.
Scores are normalised cross-correlation on a 32x40 equalised greyscale: different wanted faces score 0.4 to 0.55
against each other, so a match has to beat that clearly. Logging only until a real match calibrates the cut."""
import math, re, sys, time
from PIL import Image, ImageOps

WANTED = []   # greyscale crops, filled by read()


def _norm(img):
    a = ImageOps.equalize(img.convert("L").resize((32, 40), Image.BILINEAR)); px = list(a.tobytes())
    m = sum(px) / len(px); sd = math.sqrt(sum((p - m) ** 2 for p in px) / len(px)) or 1
    return [(p - m) / sd for p in px]


def ncc(a, b): x, y = _norm(a), _norm(b); return sum(p * q for p, q in zip(x, y)) / len(x)


def read():
    """Open the filed bulletin to its WANTED CRIMINALS page, crop the three photos, file it again."""
    p = sys.modules.get("play") or sys.modules["__main__"]
    p.drag((105, 612), (700, 420)); time.sleep(1.2)
    for _ in range(3):
        p.shot(); title = next((w for w in p.ocr() if "CRIMIN" in w["t"].upper() and w["h"] >= 20), None)   # the page title, not page 1's "most wanted international criminals"
        if title: break
        p.click((840, 600)); time.sleep(1.0)   # the page corner
    if title:
        img = Image.open(p.SHOT).convert("L")
        x, y = title["x"] - 110, title["y"] + 33   # photo k: 64 x 78 at (x, y + 98 k), measured day 14
        WANTED[:] = [img.crop((x, y + 98 * k, x + 64, y + 78 + 98 * k)) for k in range(3)]
        for k, w in enumerate(WANTED): w.save(p.HERE / "runs" / f"wanted-{k}.png")
    p.drag((700, 420), (105, 612)); time.sleep(1)
    print("wanted", len(WANTED), flush=True)


def scores(img): return [round(ncc(img, w), 2) for w in WANTED]


def match(words):
    """Best score of the passport photo on the desk against the wanted faces. The photo (about 80 x 105) sits right
    above the passport number at the bottom left; search a little around it."""
    if not WANTED: return 0
    p = sys.modules.get("play") or sys.modules["__main__"]
    img, best, at = Image.open(p.SHOT).convert("L"), 0, None
    want = [_norm(w) for w in WANTED]
    permit = [w for w in words if "PASSPO" in w["t"].upper()]   # a permit prints the number too, under "bearing passport number"
    for n in (w for w in words if w.get("w") and w["x"] > 360 and w["y"] > 236 and re.search(r"[A-Z0-9]{4,5}[-_][A-Z0-9]{4,5}", w["t"])
              and not any(0 < w["y"] - q["y"] < 45 and abs(w["x"] - q["x"]) < 120 for q in permit)):
        left = n["x"] - n["w"] / 2
        for dx in range(-10, 41, 5):   # day 14: the photo sat up to 40 px right of the number's left edge
            for dy in range(-130, -84, 5):
                box = (round(left + dx), round(n["y"] + dy), round(left + dx + 80), round(n["y"] + dy + 105))
                x = _norm(img.crop(box))
                sc = max(sum(a * b for a, b in zip(x, y)) / len(x) for y in want)
                if sc > best: best, at = sc, box
    if at: (p.HERE / "runs" / "faces").mkdir(exist_ok=True); img.crop(at).save(p.HERE / "runs" / "faces" / f"{time.strftime('%H%M%S')}-{round(best * 100)}.png")
    print("wanted match", round(best, 2), flush=True)
    return best

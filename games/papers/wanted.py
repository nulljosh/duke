"""The bulletin's three wanted faces (day 14 on), scored against each entrant's booth face and passport photo.
Scores are normalised cross-correlation on a 32x40 equalised greyscale: different wanted faces score 0.4 to 0.55
against each other, so a match has to beat that clearly. Logging only until a real match calibrates the cut."""
import math, sys, time
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
        p.shot(); title = next((w for w in p.ocr() if "WANTED" in w["t"].upper()), None)
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


def log(tag, box):
    """Print this crop's scores against the wanted faces and keep the crop, so a cited admission calibrates the cut."""
    if not WANTED: return
    p = sys.modules.get("play") or sys.modules["__main__"]
    img = Image.open(p.SHOT).convert("L").crop(tuple(round(v) for v in box))
    (p.HERE / "runs" / "faces").mkdir(exist_ok=True); img.save(p.HERE / "runs" / "faces" / f"{time.strftime('%H%M%S')}-{tag}.png")
    print(tag, scores(img), flush=True)

"""The hooded EZIC messenger (star on his face): spotted by face, his folded note opened and handed back."""
import sys, time
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

BOX, FACE = (110, 270, 290, 445), Image.open(Path(__file__).resolve().parent / "ezic-face.png").convert("L")   # cut from day 11


def hooded(img): return ImageStat.Stat(ImageChops.difference(img.convert("L").crop(BOX), FACE)).mean[0] < 12   # 67 day 8-11 frames: him 3 to 9, everyone else 16 up


def messenger(day, base):
    """The hooded EZIC messenger brings no passport, only a folded note. Open it: READ QUICKLY, RETURN TO MESSENGER means
    hand it back and he leaves (day 11 stood there until it was). Anything else he brings (decoder, cipher) is ours."""
    p = sys.modules.get("play") or sys.modules["__main__"]   # ponytail: play imports this module, so reach back lazily
    if day == 20: raise SystemExit("day 20 messenger brings poison: never touch it, play him by hand")   # ponytail: until the poison is mapped
    if day == 15:   # E7 wants both coded papers (Drex's paper and the decoder): hand over the grey ones, he slides a note back
        for i in range(6): p.drag((1010, 610), (760 + 15 * i, 300 + 15 * i)); time.sleep(0.3)   # parked cards and citations cover them
        for _ in range(2):
            g = grey(p)
            if g: p.drag(g, p.ENTRANT); time.sleep(2)
        time.sleep(3)
    for _ in range(3):
        left = p.doc_on_counter(p.shot(), base)
        if not left: break
        p.drag(left, p.DESK); time.sleep(0.8)
        for dy in (-90, -60, -30, 0):   # the fold tab sits above where the note was grabbed (day 11: 90 px)
            p.click((p.DESK[0], p.DESK[1] + dy)); time.sleep(1.0); p.shot(); ws = p.ocr()
            r = next((w for w in ws if "MESSENGER" in w["t"].upper()), None)
            if r: break
        print("ezic note", [w["t"] for w in ws if w["x"] > 360 and w["y"] > 236], flush=True)
        if r: p.drag((r["x"], r["y"] + 60), p.ENTRANT); time.sleep(4)
        else: p.drag(p.DESK, p.PARK); time.sleep(0.6)
    return "ezic messenger"


def grey(p):
    """Centre of the busiest patch of EZIC's flat (42, 42, 42) grey on the desk, or None."""
    p.shot(); img = Image.open(p.SHOT).convert("RGB").crop(p.DBOX)
    band = lambda c: c.point(lambda v: 255 if 38 <= v <= 47 else 0)
    r, g, b = img.split(); m = ImageChops.multiply(ImageChops.multiply(band(r), band(g)), band(b))
    w, h = m.size
    cells = [(ImageStat.Stat(m.crop((x, y, x + 40, y + 40))).mean[0], p.DBOX[0] + x + 20, p.DBOX[1] + y + 20) for x in range(0, w - 39, 20) for y in range(0, h - 39, 20)]
    score, x, y = max(cells)
    return (x, y) if score > 100 else None


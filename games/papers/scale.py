"""The booth scale's weight, read off its dim LCD: crop, stretch the contrast, invert, blow up 6x, OCR."""
import json, re, subprocess
from pathlib import Path
from PIL import Image, ImageOps

OCR = Path(__file__).resolve().parent.parent / "fez" / "ocr"


def read(shot):
    """[{"t": "82kg", "x": 322, "y": 630}] as a booth word for rules.verdict, or [] when unreadable."""
    for cut, k in ((2, 6), (10, 4), (5, 4), (10, 8)):   # no single stretch reads every LCD (day 14: 81 kg only at 10/4)
        im = ImageOps.invert(ImageOps.autocontrast(Image.open(shot).convert("L").crop((296, 620, 352, 642)), cutoff=cut))
        ImageOps.expand(im.resize((56 * k, 22 * k), Image.NEAREST), 40, fill=255).save("/tmp/papers-scale.png")
        out = json.loads(subprocess.run([str(OCR), "/tmp/papers-scale.png"], capture_output=True, text=True).stdout or "[]")
        m = re.search(r"(\d{2,3})\s*K", " ".join(w["t"].upper() for w in out))
        if m and int(m[1]) >= 40: return [{"t": f"{m[1]}kg", "x": 322, "y": 630}]   # under 40 is a 7 read as 1 (77 as "11"): try the next stretch
    return []

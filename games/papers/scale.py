"""The booth scale's weight, read off its dim LCD: crop, stretch the contrast, invert, blow up 6x, OCR."""
import json, re, subprocess
from pathlib import Path
from PIL import Image, ImageOps

OCR = Path(__file__).resolve().parent.parent / "fez" / "ocr"


def read(shot):
    """[{"t": "82kg", "x": 322, "y": 630}] as a booth word for rules.verdict, or [] when unreadable."""
    im = ImageOps.invert(ImageOps.autocontrast(Image.open(shot).convert("L").crop((296, 620, 352, 642)), cutoff=2))
    ImageOps.expand(im.resize((336, 132), Image.NEAREST), 40, fill=255).save("/tmp/papers-scale.png")
    out = json.loads(subprocess.run([str(OCR), "/tmp/papers-scale.png"], capture_output=True, text=True).stdout or "[]")
    m = re.search(r"(\d{2,3})\s*K", " ".join(w["t"].upper() for w in out))
    return [{"t": f"{m[1]}kg", "x": 322, "y": 630}] if m else []

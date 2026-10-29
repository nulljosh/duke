"""The live colony as an iPhone wallpaper (1320x2868): four HUD-free frames down the base, stitched, saved to iCloud Drive
Wallpapers/ so Joshua can save it from Files. python3 wallpaper.py [out.png]"""
import shutil, sys, time
from pathlib import Path
from PIL import Image
import oni

OUT = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Wallpapers/oni-colony.png"
X, ZOOM, YS = 190, 10, (146, 126, 106, 86)   # zoom 10 shows 20 cells a frame, so the centres step by 20
EDGE = 160   # the hover card can sit at the left edge; trim both sides the same


def frames():
    oni.cmd(op="ui", show=False); time.sleep(1)
    try:
        for y in YS:
            oni.cmd(op="camera", x=X, y=y, zoom=ZOOM); time.sleep(1.5)
            yield Image.open(shutil.copy(oni.shot(), f"/tmp/oni-wall-{y}.png")).convert("RGB")
    finally:
        oni.cmd(op="ui", show=True); oni.cmd(op="camera", x=190, y=122, zoom=14)


def main(out=OUT):
    tiles = [t.crop((EDGE, 0, t.width - EDGE, t.height)) for t in frames()]
    w, h = tiles[0].size; tall = Image.new("RGB", (w, h * len(tiles)))
    for i, t in enumerate(tiles): tall.paste(t, (0, i * h))
    tw, th = 1320, 2868; tall = tall.resize((tw, round(tall.height * tw / w)), Image.LANCZOS)
    top = (tall.height - th) // 2 - 150   # a little above centre keeps the base in the lower two thirds, under the clock
    Path(out).parent.mkdir(parents=True, exist_ok=True); tall.crop((0, top, tw, top + th)).save(out); return out


if __name__ == "__main__":
    print(main(*sys.argv[1:]))

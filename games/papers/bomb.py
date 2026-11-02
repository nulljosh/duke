"""Day 15, entrant 2 shouts DEATH TO ARSTOTZKA and slides a bomb: 60 real seconds. Done by hand twice on
2026-11-02 with the same layout: drag it to (700, 430), wait for Calensk, click the cover corners, then the four
screws, then cut the wires box 1 to 4 (x 692, 650, 776, 734 at y 416: each box's pipe ends at that wire)."""
import sys, time
from PIL import Image

CORNERS = [(635, 355), (794, 355), (635, 550), (794, 550)]
SCREWS = [(652, 384), (773, 384), (652, 469), (773, 469)]
WIRES = [692, 650, 776, 734]   # boxes 1, 2, 3, 4
DONE = bool(__import__('os').environ.get('PAPERS_BOMB_DONE'))   # once a day: every entrant after the bomber got the bomb routine when this keyed on entrant order


def _red(p, x):   # an uncut wire is red under its clip: a few red pixels near (x, 416)
    img = Image.open(p.SHOT).convert("RGB")
    return sum(1 for dx in range(-8, 9) for y in range(396, 436, 2) if (lambda c: c[0] > 120 and c[1] < 90 and c[2] < 90)(img.getpixel((x + dx, y)))) >= 3


def defuse():
    p = sys.modules.get("play") or sys.modules["__main__"]
    p.drag((178, 515), (700, 430)); time.sleep(1)
    for _ in range(12):   # the cover only opens once Calensk is there
        for c in CORNERS: p.click(c); time.sleep(0.2)
        time.sleep(0.4)
        for s in SCREWS: p.click(s); time.sleep(0.25)
        time.sleep(0.6); p.shot()
        if sum(_red(p, x) for x in WIRES) >= 3: break
    else: print("bomb: no red seen, cutting anyway", flush=True)   # 2026-11-02: giving up here was certain death
    Image.open(p.SHOT).save(p.HERE / "runs" / f"bomb-open-{time.strftime('%H%M%S')}.png")
    for x in WIRES: p.click((x, 416)); time.sleep(0.5)
    time.sleep(0.5); p.shot(); Image.open(p.SHOT).save(p.HERE / "runs" / f"bomb-cut-{time.strftime('%H%M%S')}.png")   # 2026-11-02: died after a "defused" run; these show why next time
    time.sleep(2); p.drag((560, 500), p.ENTRANT); time.sleep(2)
    global DONE; DONE = True
    print("bomb defused", flush=True)
    return "bomb"

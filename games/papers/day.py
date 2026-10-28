"""One command per day: the night's budget, sleep, the walk to work, the booth, a line in progress.jsonl and the graph.
Run it from the night screen of the day before: `python3 day.py <next day>`."""
import json, re, subprocess, sys, time
from PIL import Image
import play

RADIO_X = 801
COSTS = {"FOOD": 20, "HEAT": 10, "MEDIC": 5, "UPGRADE": 5}
WHO = {"WIFE": ("WIFE", "IFE"), "SON": ("SON", "SOH"), "MIL": ("MIL",), "UNCLE": ("UNCLE", "NCLE", "UHCLE")}
FAMILY = [("WIFE", 187), ("SON", 273), ("MIL", 359), ("UNCLE", 445)]   # status circles, right of the ledger


def status(rgb, rows):
    """Who is sick (the ledger only offers medicine for them) and who is very sick (their middle circle turns red)."""
    sick = {r["who"] for r in rows if "MEDIC" in r["t"]}
    return {who: {"sick": who in sick, "very": rgb.getpixel((1038, y))[0] > 150 and rgb.getpixel((1038, y))[1] < 80}
            for who, y in FAMILY}


def ledger(words):
    """Optional rows: label, cost and the row's y, plus the night total."""
    rows = []
    for w in words:
        t = w["t"].upper()
        if 360 < w["x"] < 600 and w["y"] > 220 and re.search(r"FOOD|HEAT|MEDIC|UPGRADE", t):
            cost = next(v for k, v in COSTS.items() if k in t)   # ponytail: fixed prices; read the -N column if they ever change
            who = next((k for k, alts in WHO.items() if any(a in t for a in alts)), None)
            rows.append({"t": t, "y": w["y"], "cost": cost, "who": who})
    total = next((int(re.sub(r"[^\d-]", "", w["t"]) or 0) for w in words if re.fullmatch(r"[$S]-?\d+", w["t"]) and w["y"] > 520), 0)
    return rows, total


def plan(rows, total, checked, fam):
    """Pick rows to buy: medicine for the very sick, food (hunger is what keeps making them sick), medicine for the sick,
    weakest first (wiki: uncle lasts 3 sick days, son and mother-in-law 4, wife 5), then heat. Never end below zero."""
    money = total + sum(r["cost"] for r, c in zip(rows, checked) if c)
    want = []
    meds = lambda very: sorted((r for r in rows if "MEDIC" in r["t"] and r["who"] and fam[r["who"]]["very"] == very and fam[r["who"]]["sick"]),
                               key=lambda r: ["UNCLE", "SON", "MIL", "WIFE"].index(r["who"]))
    order = meds(True) + [r for r in rows if "FOOD" in r["t"]] + meds(False) + [r for r in rows if "HEAT" in r["t"]]
    for r in order:
        if r["cost"] <= money and r not in want: want.append(r); money -= r["cost"]
    return want, money


def night():
    play.cli(f"m:{play.at(600, 650)}"); time.sleep(0.3)   # off the radios first: a hidden dot reads as unchecked
    img = play.shot(); rgb = Image.open(play.SHOT).convert("RGB"); words = play.ocr()
    rows, total = ledger(words)
    checked = [rgb.getpixel((RADIO_X, round(r["y"])))[0] > 150 for r in rows]
    fam = status(rgb, rows); want, left = plan(rows, total, checked, fam)
    print("ledger", total, [(r["t"], r["who"], c) for r, c in zip(rows, checked)], {k: v for k, v in fam.items() if v["sick"]}, flush=True)   # why a row was or wasn't bought
    for _ in range(3):   # click, then read the radios back: a missed click here is a dead family member tomorrow
        for r, c in zip(rows, checked):
            if (r in want) != c: play.click((RADIO_X, round(r["y"]))); time.sleep(0.4)
        play.cli(f"m:{play.at(600, 650)}"); time.sleep(0.3)   # the cursor over a radio hides its dot
        play.shot(); rgb = Image.open(play.SHOT).convert("RGB")
        checked = [rgb.getpixel((RADIO_X, round(r["y"])))[0] > 150 for r in rows]
        if all((r in want) == c for r, c in zip(rows, checked)): break
    else: sys.exit("night purchases did not take")
    return left, [r["t"] for r in want]


def morning():
    """Sleep, then click through whatever comes before the booth (letters, the newspaper) until WALK TO WORK."""
    play.click((1055, 602)); time.sleep(5)
    for _ in range(8):
        play.shot(); words = play.ocr()
        btn = next((w for w in words if re.search(r"WALK TO WORK|NEXT|CONTINUE", w["t"].upper()) and w["y"] > 560), None)
        if btn and "WALK" in btn["t"].upper(): play.click((btn["x"], btn["y"])); time.sleep(10); return True
        play.click((btn["x"], btn["y"]) if btn else (568, 627)); time.sleep(3)
    return False


def reload(day):
    """Replay a day from its morning save: quit without sleeping, relaunch through Steam, Story, pick the day."""
    play.mine(); subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke "q" using command down']); time.sleep(4)   # Cmd+Q must hit the game, never his app
    subprocess.run(["open", "steam://run/239030"])
    for _ in range(30):
        time.sleep(3)
        pid = subprocess.run(["pgrep", "PapersPlease"], capture_output=True, text=True).stdout.split()
        if pid: break
    time.sleep(12)
    subprocess.run(["osascript", "-e", f'tell application "System Events" to set frontmost of (first process whose unix id is {pid[0]}) to true'])
    open_day(day)


def open_day(day):
    """From the title screen: Story, the day's slot, continue, walk to work."""
    for _ in range(5):   # the menu shows straight away or after a click; a blind click can land on the credits
        play.shot(); story = next((w for w in play.ocr() if w["t"].upper().strip() == "STORY"), None)
        if story: play.click((story["x"], story["y"])); time.sleep(3); break
        play.click((568, 450)); time.sleep(2)
    else: sys.exit("no STORY button on the title screen")   # past the title, then STORY
    play.click((70 + 140 * (day - 1), 205)); time.sleep(3); play.click((568, 437)); time.sleep(5)   # ponytail: one row of days; a second row past day 8 needs its y
    play.click((568, 627)); time.sleep(10)


def graph():
    subprocess.run([sys.executable, str(play.HERE / "progress.py")], capture_output=True)
    subprocess.run(["rsvg-convert", str(play.HERE / "progress.svg"), "-o", "/tmp/papers-progress.png"])
    tools = play.HERE.parent.parent / "tools"   # the wallpaper bulletin carries the day and the tally, so redraw it too
    subprocess.run([sys.executable, "-c", "from papersart import papers\nfor k in ('phone', 'desktop'): papers(k).save(f'../brand/wallpapers/papers-{k}.png', optimize=True)"], cwd=tools)


def _check():
    rows = [{"t": "FOOD", "y": 1, "cost": 20, "who": None}, {"t": "HEAT", "y": 2, "cost": 10, "who": None},
            {"t": "MEDICINE (UNCLE)", "y": 3, "cost": 5, "who": "UNCLE"}, {"t": "MEDICINE (SON)", "y": 4, "cost": 5, "who": "SON"}]
    fam = {k: {"very": k == "UNCLE", "sick": k in ("UNCLE", "SON"), "cold": True, "hungry": True} for k in ("WIFE", "SON", "MIL", "UNCLE")}
    want, left = plan(rows, 15, [False] * 4, fam)
    assert [r["t"] for r in want] == ["MEDICINE (UNCLE)", "MEDICINE (SON)"] and left == 5   # food (20) doesn't fit, the son's medicine does
    want, left = plan(rows, 40, [False] * 4, fam)
    assert [r["t"] for r in want] == ["MEDICINE (UNCLE)", "FOOD", "MEDICINE (SON)", "HEAT"] and left == 0


if __name__ == "__main__":
    _check()
    day = int(sys.argv[1])
    if "--replay" in sys.argv: reload(day)
    elif "--resume" in sys.argv: pass   # already in the booth mid-day
    elif "--title" in sys.argv: open_day(day)   # the game was just launched and sits on its title screen
    else:
        left, bought = night(); print("night", left, bought, flush=True)
        if left < 0: sys.exit("night ends below zero: sleeping is game over. Cmd+Q and replay the day before")
        if not morning(): sys.exit("stuck before the booth")
    booth = subprocess.run([sys.executable, str(play.HERE / "play.py"), str(day)], capture_output=True, text=True); log = booth.stdout
    (play.HERE / "runs").mkdir(exist_ok=True); (play.HERE / "runs" / f"day{day}-{time.strftime('%H%M')}.log").write_text(log + booth.stderr)   # each entrant's OCR, to write the next day's rules from
    if booth.returncode: sys.exit(f"stuck in the booth: {booth.stderr.strip().splitlines()[-1:]}; quit before Sleep and run --replay")
    n = sum(1 for l in log.splitlines() if "('approve'" in l or "('deny'" in l)
    if not n: sys.exit("nobody processed: not a real day, nothing logged")
    play.shot(); words = play.ocr(); rows, total = ledger(words)
    fam = status(Image.open(play.SHOT).convert("RGB"), rows)
    note = ", ".join(f"{k.lower()} {'very sick' if v['very'] else 'sick' if v['sick'] else 'ok'}" for k, v in fam.items())
    with open(play.HERE / "progress.jsonl", "a") as f: f.write(json.dumps({"day": day, "entrants": n, "money": total, "family": note}) + "\n")
    graph(); print("day", day, "entrants", n, "total before buying", total, note)

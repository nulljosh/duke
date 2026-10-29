"""Run the colony: place the build plan as materials allow, keep research going, unpause, and save a screenshot and a
progress row at the start of every cycle. python3 play.py [until_cycle]. The plan is for the Skewed Asteroid start
(Printing Pod at 186,120); colony 1's lessons are in README.md."""
import json, shutil, subprocess, sys, time
from pathlib import Path
import oni

HERE = Path(__file__).resolve().parent
BASE = (190, 122)   # camera centre for the cycle shots
RESEARCH = ["FarmingTech", "PowerRegulation", "Jobs", "AdvancedResearch", "ImprovedOxygen", "SanitationSciences", "FineDining",
            "BasicRefinement", "Combustion", "Distillation", "Smelting", "Agriculture", "TemperatureModulation", "LiquidTemperature",
            "BasicRocketry", "SkyDetectors", "MedicineI"]   # Distillation: the Water Sieve. Everything past Combustion needs the Super Computer's points
WIRES = [[x, y] for y in (120, 121) for x in range(191, 200)] + [[200, 121], [201, 121], [202, 121], [201, 122], [202, 122]]   # ports sit on either row, so wire both and join them; the tail feeds musher 2
WIRES += [[x, 120] for x in range(169, 176)] + [[x, 121] for x in range(169, 191)]   # west wing: the coal generator and the Super Computer
PLANTERS = [(x, 125) for x in range(197, 201)]   # only where the headroom is open; seeds are the limit, not boxes (colony 6 built 16, all read "No Seed Available")
COLONY = 7
# id, x, y, priority. 2-wide buildings sit on x and x+1, 3-wide ones are centred on x. The room is x177-200, y120-123.
PLAN = [("Outhouse", 178, 120, 7), ("WashBasin", 181, 120, 6),
        ("ManualGenerator", 191, 120, 7), ("ResearchCenter", 193, 120, 6),
        *[("Wire", x, y, 6) for x, y in WIRES],
        ("Tile", 196, 119, 6), ("Tile", 199, 119, 6),
        ("MicrobeMusher", 196, 120, 7), ("Battery", 198, 120, 6),
        ("MineralDeoxidizer", 199, 120, 6),
        *[("Ladder", 190, y, 5) for y in range(120, 126)],
        *[("Tile", x, 124, 5) for x in range(191, 200)],   # the bedroom floor, whatever the dig leaves of it
        ("Bed", 191, 125, 5), ("Bed", 193, 125, 5), ("Bed", 195, 125, 5),
        *[("PlanterBox", x, y, 5) for x, y in PLANTERS],
        *[("Ladder", 180, y, 6) for y in range(108, 120)],
        *[("Tile", x, 109, 9) for x in (181, 182, 183)],   # the corridor crosses an open cavity there
        ("LiquidPumpingStation", 189, 110, 9),   # both columns (189-190) water from y109 down to 106 on the fresh map, dry base cells, reached from the corridor at 188 (preflight.py checks it)
        *[("Ladder", 184, y, 7) for y in range(112, 119)],   # up from the corridor through a streak of dirt
        *[("Ladder", 180, y, 6) for y in range(100, 108)], *[("Ladder", 189, y, 5) for y in range(126, 138)],   # the mine grid's spines
        ("MicrobeMusher", 201, 121, 8),
        *[("Tile", x, 119, 8) for x in (169, 170, 171, 173, 175)],   # the west wing's floor has gaps
        ("AdvancedResearchCenter", 174, 120, 8), ("Generator", 170, 120, 7),
        ("MassageTable", 176, 120, 8)]   # stress relief; the generator's wires pass under it   # Super Computer: research stalls without its points   # a second musher on the pool ledge: one can't cook for six   # between the terrariums, on the bedroom floor
ROOM = [[x, y] for y in range(120, 124) for x in [*range(177, 183), *range(191, 201)]]
BEDROOM = [[190, 124]] + [[x, y] for y in (125, 126) for x in range(190, 201)]
LEDGE = [[201, y] for y in (121, 122, 123)] + [[202, y] for y in (121, 122, 123)]   # over a one-tile dam at y120: the pool keeps most of its water
SHAFT = [[180, y] for y in range(119, 99, -1)]   # down to the dirt below the floor: a ladder in every cell, so nobody gets stuck
SPINE = [[189, y] for y in range(124, 138)]   # up from the bedroom level, the same way
MINES = [[x, y] for y0 in (101, 105, 129, 133) for y in (y0, y0 + 1) for x in range(155, 216)]   # corridors off the shaft and spine
LOWER = [[x, y] for y in (110, 111) for x in range(150, 220)]   # a corridor off the bottom of the shaft, both ways
UPPER = [[x, y] for y in range(124, 128) for x in range(177, 190)]   # air volume above the west room, so the diffuser never hits max pressure


def log(*a): print(time.strftime("%H:%M:%S"), *a, flush=True)


FOOD_PACKAGES = ("MushBar", "BasicPlantFood", "FieldRation", "Meat", "CookedMeat", "Pacu", "BasicPlantSeed", "PrickleFruit", "SwampFruit", "ColdWheatSeed")


def near(cells, n): return sorted(cells, key=lambda c: abs(c[0] - 190) + 2 * abs(c[1] - 121))[:n]


def topup(have, element, low, n=15):
    """Dirt feeds research, mush and planters; algae the diffuser. Low stock digs the nearest safe cells of it; if none
    are reachable, tunnel through the safe rock closest to the seam."""
    if have.get(element, 0) >= low: return
    seam = near(oni.cells(element, 160, 100, 220, 140), 300)
    r = oni.cmd(op="safedig", cells=seam, floor=109, prio=6, max=n)   # 109: the shaft and corridor reach down that far
    if r["placed"] < 3 and seam:
        g = oni.cmd(op="grid", x0=160, y0=109, x1=220, y1=140); solid = {k for k, v in g["legend"].items() if v.endswith("solid")}
        rock = [[160 + i, 140 - k] for k, row in enumerate(g["rows"]) for i, ch in enumerate(row) if ch in solid]
        gap = lambda c: min(abs(c[0] - t[0]) + abs(c[1] - t[1]) for t in seam[:40])
        r = oni.cmd(op="safedig", cells=sorted(rock, key=gap)[:400], floor=109, prio=6, max=8)
    log("topup", element, r)


def floor():
    """Holes in the base's floor row cut the room in two (colony 4: a pit under the wash basin); tile every open cell."""
    g = oni.cmd(op="grid", x0=176, y0=119, x1=202, y1=119); open_ = {k for k, v in g["legend"].items() if not v.endswith("solid")}
    for i, ch in enumerate(g["rows"][0]):
        if ch in open_: log("floor hole", 176 + i, oni.cmd(op="build", id="Tile", x=176 + i, y=119, prio=9).get("ok"))


def explore(s):
    """Idle dupes are wasted labor: give them the nearest safe rock at low priority, so the base grows and digs turn up seams."""
    if sum(d["chore"] in (None, "IdleChore") for d in s["dupes"]) < 2: return
    g = oni.cmd(op="grid", x0=150, y0=110, x1=225, y1=140); solid = {k for k, v in g["legend"].items() if v.endswith("solid")}
    rock = near([[150 + i, 140 - k] for k, row in enumerate(g["rows"]) for i, ch in enumerate(row) if ch in solid], 600)
    log("explore", oni.cmd(op="safedig", cells=rock, floor=109, prio=3, max=12))   # the corridor level counts too


def seeds():
    wild = [[x, y] for name, x, y in oni.cmd(op="plants") if "BasicSingleHarvestPlant" in name and abs(x - 190) < 40 and abs(y - 121) < 25
            and not any(x == px and y in (py, py + 1) for px, py in PLANTERS)]   # the planter boxes' own Mealwood: uprooting it every minute starved colony 5
    if wild: log("uproot mealwood", oni.cmd(op="uproot", cells=wild))


def skills():
    """One dupe takes Advanced Research (the Super Computer needs it) and nobody learns anything else: every skill raises a
    dupe's morale need, and colony 5's two skills each drove everyone to stress 100."""
    dupes = oni.cmd(op="skills"); researcher = any("Researching1" in d["mastered"] for d in dupes)
    for d in dupes:
        if d["points"] < 1: continue
        if researcher: break
        want = "Researching1"
        r = oni.cmd(op="learn", name=d["name"], skill=want); log("skill", d["name"], want, r)
        researcher = researcher or (want == "Researching1" and r.get("ok"))


def printables(s):
    """Every few cycles the pod offers dupes or packages: take food, and no new mouths while the larder is thin."""
    if not s["immigrants"]: return
    oni.cmd(op="printables"); time.sleep(2); offers = oni.cmd(op="printables")
    if not isinstance(offers, list): return
    water = s["have"].get("Water", 0)
    pick = next((i for i, o in enumerate(offers) if o.startswith("package") and (any(f in o for f in FOOD_PACKAGES) or water < 2000 and "Water" in o)), None)   # colony 6 passed on Water x2000 a minute before its last dupe died
    if pick is None and water > 3000 and s["foodKcal"] > 8000 and len(s["dupes"]) < 4: pick = next((i for i, o in enumerate(offers) if o.startswith("dupe")), None)   # a dupe drinks ~94 kg of water a cycle as mush; gate on water, not kcal
    if pick is not None: log("print", offers[pick], oni.cmd(op="print", index=pick))
    else: oni.cmd(op="invoke", type="ImmigrantScreen", method="OnPressBack"); log("pod offers passed", offers)
    oni.cmd(op="speed", speed=2)


def run(until):
    done, tries, last_cycle, mush, mush2, planted, t_link, clock = set(), {}, None, False, False, set(), 0, None
    for cells, prio in ((ROOM, 6), (BEDROOM, 5), (UPPER, 3)): log("dig", oni.cmd(op="safedig", cells=cells, floor=119, prio=prio))
    log("ledge", oni.cmd(op="dig", cells=LEDGE, prio=6))   # touches the pool on purpose
    while True:
        s = oni.state()
        if not s.get("inGame"): log("not in game", s.get("screens")); time.sleep(10); continue
        if not s["dupes"]: log("everyone is dead at cycle", s["cycle"]); return
        if s["paused"]: oni.cmd(op="speed", speed=2); log("unpaused")   # 0 to 2, 2 is the fastest
        now = s["cycle"] + s["cycleFrac"]
        if not s["paused"] and now == clock: oni.unhide(); log("clock stalled, unhid the game")   # a hidden app stops simulating
        clock = now
        if s["cycle"] != last_cycle:
            last_cycle = s["cycle"]
            oni.cmd(op="camera", x=BASE[0], y=BASE[1], zoom=14); time.sleep(1)
            shot = HERE / "shots" / f"c{COLONY}-cycle-{s['cycle']:03d}.png"; shot.parent.mkdir(exist_ok=True)
            shutil.copy(oni.shot(), shot)
            row = {"colony": COLONY, "cycle": s["cycle"], "dupes": len(s["dupes"]), "foodKcal": round(s["foodKcal"]), "research": s["research"],
                   "done": len(s["researchDone"]), "buildings": len(s["buildings"]),
                   "worst": min(((d["name"], round(d["breath"]), round(d["stress"]), round(d["kcal"])) for d in s["dupes"]), key=lambda d: d[3])}
            with open(HERE / "progress.jsonl", "a") as f: f.write(json.dumps(row) + "\n")
            log("cycle", row)
            if s["cycle"] > until: return
        if not s["research"]:
            nxt = next((t for t in RESEARCH if t not in s["researchDone"]), None)
            if nxt: log("research", nxt, oni.cmd(op="research", tech=nxt))
        for item in PLAN:
            if item in done or tries.get(item, 0) > 60: continue
            r = oni.cmd(op="build", id=item[0], x=item[1], y=item[2], prio=item[3])
            if r.get("ok"): done.add(item); log("placed", item, r.get("mats"))
            elif "not enough material" not in str(r.get("error")):   # short of metal is worth waiting for; colony 6 gave up on its Super Computer
                tries[item] = tries.get(item, 0) + 1
                if tries[item] in (1, 61): log("waiting", item, r.get("error"))
        if time.time() - t_link > 60:   # wires placed one at a time join nothing until linked; a reload drops the links too
            oni.cmd(op="link", cells=WIRES); oni.cmd(op="mop", cells=[[x, 120] for x in range(177, 203)]); t_link = time.time()
            for cells, prio in ((ROOM, 6), (BEDROOM, 5), (UPPER, 3)): oni.cmd(op="safedig", cells=cells, floor=119, prio=prio)   # more come in reach as the room opens up
            oni.cmd(op="safedig", cells=SHAFT, floor=99, prio=6); oni.cmd(op="safedig", cells=LOWER, floor=109, prio=5)
            oni.cmd(op="safedig", cells=SPINE, floor=119, prio=5); oni.cmd(op="safedig", cells=near(MINES, 999), floor=100, prio=4, max=20)
            oni.cmd(op="dig", cells=[[188, 110], [188, 111]], prio=8)   # the step beside the pump: water only touches it diagonally, and liquid never climbs, so safedig's 3x3 rule is too strict here
            oni.cmd(op="safedig", cells=[[184, y] for y in range(112, 119)] + [[179, 109], [179, 108]], floor=100, prio=8)   # dirt beside the ladders
            topup(s["have"], "Dirt", 1500); topup(s["have"], "Algae", 300); topup(s["have"], "Cuprite", 800); floor(); explore(s); seeds(); printables(s); skills()
            hungry = s["foodKcal"] < 6000   # research and the musher both eat dirt; food wins well before the larder is empty
            oni.cmd(op="prio", x=196, y=120, p=9); oni.cmd(op="prio", x=201, y=121, p=9); oni.cmd(op="prio", x=193, y=120, p=1 if hungry else 5)
            oni.cmd(op="prio", x=174, y=120, p=1 if s["have"].get("Water", 0) < 2000 else 5)   # the Super Computer drinks 50 kg of water a point (AdvancedResearchCenterConfig); the mushers come first
        if not mush and oni.cmd(op="queue", x=196, y=120, recipe="MicrobeMusher_I_Dirt_Water_O_MushBar").get("ok"): mush = True; log("mush bars queued")
        if not mush2 and oni.cmd(op="queue", x=201, y=121, recipe="MicrobeMusher_I_Dirt_Water_O_MushBar").get("ok"): mush2 = True; log("musher 2 queued")
        for x, y in PLANTERS:
            if (x, y) not in planted and oni.cmd(op="plant", x=x, y=y, seed="BasicPlantSeed").get("ok"): planted.add((x, y)); log("mealwood ordered", x, y)
        time.sleep(10)


if __name__ == "__main__":
    run(int(sys.argv[1]) if len(sys.argv) > 1 else 30)

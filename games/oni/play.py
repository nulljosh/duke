"""Run the colony: place the build plan as materials allow, keep research going, unpause, and save a screenshot and a
progress row at the start of every cycle. python3 play.py [until_cycle]. The plan is for the Skewed Asteroid start
(Printing Pod at 186,120); colony 1's lessons are in README.md."""
import json, shutil, subprocess, sys, time
from pathlib import Path
import oni

HERE = Path(__file__).resolve().parent
BASE = (190, 122)   # camera centre for the cycle shots
RESEARCH = ["FarmingTech", "PowerRegulation", "Jobs", "AdvancedResearch", "ImprovedOxygen", "SanitationSciences", "FineDining",
            "BasicRefinement", "Combustion", "MedicineI", "Agriculture"]
WIRES = [[x, y] for y in (120, 121) for x in range(191, 200)]   # ports sit on either row, so wire both and join them
# id, x, y, priority. 2-wide buildings sit on x and x+1, 3-wide ones are centred on x. The room is x177-200, y120-123.
PLAN = [("Outhouse", 178, 120, 7), ("WashBasin", 181, 120, 6),
        ("ManualGenerator", 191, 120, 7), ("ResearchCenter", 193, 120, 6),
        *[("Wire", x, y, 6) for x, y in WIRES],
        ("Tile", 196, 119, 6), ("Tile", 199, 119, 6),
        ("MicrobeMusher", 196, 120, 7), ("Battery", 198, 120, 6), ("LiquidPumpingStation", 203, 118, 7),
        ("MineralDeoxidizer", 199, 120, 6),
        *[("Ladder", 190, y, 5) for y in range(120, 126)],
        *[("Tile", x, 124, 5) for x in range(191, 200)],   # the bedroom floor, whatever the dig leaves of it
        ("Bed", 191, 125, 5), ("Bed", 193, 125, 5), ("Bed", 195, 125, 5),
        ("AlgaeHabitat", 197, 125, 5), ("AlgaeHabitat", 199, 125, 5),
        ("PlanterBox", 198, 125, 5), ("PlanterBox", 200, 125, 5),
        *[("Ladder", 180, y, 6) for y in range(108, 120)],
        *[("Tile", x, 109, 9) for x in (181, 182, 183)],   # the corridor crosses an open cavity there
        ("LiquidPumpingStation", 189, 105, 8), ("Ladder", 188, 108, 7), ("Ladder", 188, 109, 7)]   # the second pool, under the corridor   # between the terrariums, on the bedroom floor
ROOM = [[x, y] for y in range(120, 124) for x in [*range(177, 183), *range(191, 201)]]
BEDROOM = [[190, 124]] + [[x, y] for y in (125, 126) for x in range(190, 201)]
LEDGE = [[201, y] for y in (121, 122, 123)] + [[202, y] for y in (121, 122, 123)]   # over a one-tile dam at y120: the pool keeps most of its water
SHAFT = [[180, y] for y in range(119, 107, -1)]   # down to the dirt below the floor: a ladder in every cell, so nobody gets stuck
LOWER = [[x, y] for y in (110, 111) for x in range(168, 206)]   # a corridor off the bottom of the shaft
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
    g = oni.cmd(op="grid", x0=165, y0=119, x1=215, y1=140); solid = {k for k, v in g["legend"].items() if v.endswith("solid")}
    rock = near([[165 + i, 140 - k] for k, row in enumerate(g["rows"]) for i, ch in enumerate(row) if ch in solid], 400)
    log("explore", oni.cmd(op="safedig", cells=rock, floor=119, prio=3, max=12))


def seeds():
    wild = [[x, y] for name, x, y in oni.cmd(op="plants") if "BasicSingleHarvestPlant" in name and abs(x - 190) < 40 and abs(y - 121) < 25]
    if wild: log("uproot mealwood", oni.cmd(op="uproot", cells=wild))


def printables(s):
    """Every few cycles the pod offers dupes or packages: take food, and no new mouths while the larder is thin."""
    if not s["immigrants"]: return
    oni.cmd(op="printables"); time.sleep(2); offers = oni.cmd(op="printables")
    if not isinstance(offers, list): return
    pick = next((i for i, o in enumerate(offers) if o.startswith("package") and any(f in o for f in FOOD_PACKAGES)), None)
    if pick is None and s["foodKcal"] > 8000 and len(s["dupes"]) < 4: pick = next((i for i, o in enumerate(offers) if o.startswith("dupe")), None)
    if pick is not None: log("print", offers[pick], oni.cmd(op="print", index=pick))
    else: oni.cmd(op="invoke", type="ImmigrantScreen", method="OnPressBack"); log("pod offers passed", offers)
    oni.cmd(op="speed", speed=2)


def run(until):
    done, tries, last_cycle, mush, planted, t_link, clock = set(), {}, None, False, set(), 0, None
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
            shot = HERE / "shots" / f"c4-cycle-{s['cycle']:03d}.png"; shot.parent.mkdir(exist_ok=True)
            shutil.copy(oni.shot(), shot)
            row = {"colony": 4, "cycle": s["cycle"], "dupes": len(s["dupes"]), "foodKcal": round(s["foodKcal"]), "research": s["research"],
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
            else:
                tries[item] = tries.get(item, 0) + 1
                if tries[item] in (1, 61): log("waiting", item, r.get("error"))
        if time.time() - t_link > 60:   # wires placed one at a time join nothing until linked; a reload drops the links too
            oni.cmd(op="link", cells=WIRES); oni.cmd(op="mop", cells=[[x, 120] for x in range(177, 203)]); t_link = time.time()
            for cells, prio in ((ROOM, 6), (BEDROOM, 5), (UPPER, 3)): oni.cmd(op="safedig", cells=cells, floor=119, prio=prio)   # more come in reach as the room opens up
            oni.cmd(op="safedig", cells=SHAFT, floor=107, prio=6); oni.cmd(op="safedig", cells=LOWER, floor=109, prio=5)
            oni.cmd(op="dig", cells=[[188, 109], [188, 108]], prio=8)   # the ladder down to the second pump; touches the pool on purpose
            topup(s["have"], "Dirt", 600); topup(s["have"], "Algae", 300); floor(); explore(s); seeds(); printables(s)
            hungry = s["foodKcal"] < 6000   # research and the musher both eat dirt; food wins well before the larder is empty
            oni.cmd(op="prio", x=196, y=120, p=9); oni.cmd(op="prio", x=193, y=120, p=1 if hungry else 5)
        if not mush and oni.cmd(op="queue", x=196, y=120, recipe="MicrobeMusher_I_Dirt_Water_O_MushBar").get("ok"): mush = True; log("mush bars queued")
        for x in (198, 200):
            if x not in planted and oni.cmd(op="plant", x=x, y=125, seed="BasicPlantSeed").get("ok"): planted.add(x); log("mealwood ordered", x)
        time.sleep(10)


if __name__ == "__main__":
    run(int(sys.argv[1]) if len(sys.argv) > 1 else 30)

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
        ("PlanterBox", 198, 125, 5), ("PlanterBox", 200, 125, 5)]   # between the terrariums, on the bedroom floor
ROOM = [[x, y] for y in range(120, 124) for x in [*range(177, 183), *range(191, 201)]]
BEDROOM = [[190, 124]] + [[x, y] for y in (125, 126) for x in range(190, 201)]
LEDGE = [[201, y] for y in (121, 122, 123)] + [[202, y] for y in (121, 122, 123)]   # over a one-tile dam at y120: the pool keeps most of its water
UPPER = [[x, y] for y in range(124, 128) for x in range(177, 190)]   # air volume above the west room, so the diffuser never hits max pressure


def log(*a): print(time.strftime("%H:%M:%S"), *a, flush=True)


def topup(have, element, low, n=15):
    """Dirt feeds research, mush and planters; algae the diffuser. When stock runs low, dig the nearest few cells of it
    that touch no liquid, at normal priority (colony 1 starved behind 225 digs at priority 9)."""
    if have.get(element, 0) >= low: return
    near = sorted(oni.cells(element, 166, 108, 212, 134), key=lambda c: abs(c[0] - 190) + 2 * abs(c[1] - 121))
    log("topup", element, oni.cmd(op="dig", cells=oni.safe(near[:n * 2])[:n], prio=5))


def run(until):
    done, tries, last_cycle, mush, planted, t_link = set(), {}, None, False, set(), 0
    for cells, prio in ((ROOM, 6), (BEDROOM, 5), (UPPER, 3)): log("dig", oni.cmd(op="dig", cells=oni.safe(cells), prio=prio))
    log("ledge", oni.cmd(op="dig", cells=LEDGE, prio=6))   # touches the pool on purpose
    while True:
        s = oni.state()
        if not s.get("inGame"): log("not in game", s.get("screens")); time.sleep(10); continue
        if not s["dupes"]: log("everyone is dead at cycle", s["cycle"]); return
        if s["paused"]: oni.cmd(op="speed", speed=2); log("unpaused")   # 0 to 2, 2 is the fastest
        if s["cycle"] != last_cycle:
            last_cycle = s["cycle"]
            oni.cmd(op="camera", x=BASE[0], y=BASE[1], zoom=14); time.sleep(1)
            shot = HERE / "shots" / f"c2-cycle-{s['cycle']:03d}.png"; shot.parent.mkdir(exist_ok=True)
            shutil.copy(oni.shot(), shot)
            row = {"colony": 2, "cycle": s["cycle"], "dupes": len(s["dupes"]), "foodKcal": round(s["foodKcal"]), "research": s["research"],
                   "done": len(s["researchDone"]), "buildings": len(s["buildings"]),
                   "worst": min(((d["name"], round(d["breath"]), round(d["stress"]), round(d["kcal"])) for d in s["dupes"]), key=lambda d: d[3])}
            with open(HERE / "progress.jsonl", "a") as f: f.write(json.dumps(row) + "\n")
            log("cycle", row)
            subprocess.Popen([sys.executable, "oniart.py"], cwd=HERE.parent.parent / "tools", stdout=subprocess.DEVNULL)   # the phone wallpaper carries the cycle
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
            topup(s["have"], "Dirt", 400); topup(s["have"], "Algae", 300)
        if not mush and oni.cmd(op="queue", x=196, y=120, recipe="MicrobeMusher_I_Dirt_Water_O_MushBar").get("ok"): mush = True; log("mush bars queued")
        for x in (198, 200):
            if x not in planted and oni.cmd(op="plant", x=x, y=125, seed="BasicPlantSeed").get("ok"): planted.add(x); log("mealwood ordered", x)
        time.sleep(10)


if __name__ == "__main__":
    run(int(sys.argv[1]) if len(sys.argv) > 1 else 30)

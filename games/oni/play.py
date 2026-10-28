"""Run the colony: place the build plan as materials allow, keep research going, unpause, and save a screenshot and a
progress row at the start of every cycle. python3 play.py [until_cycle]. The plan lives in PLAN, edit it between runs."""
import json, shutil, sys, time
from pathlib import Path
import oni

HERE = Path(__file__).resolve().parent
BASE = (190, 122)   # camera centre for the cycle shots
RESEARCH = ["FarmingTech", "PowerRegulation", "Jobs", "AdvancedResearch", "ImprovedOxygen", "SanitationSciences", "FineDining",
            "BasicRefinement", "Combustion", "MedicineI", "Agriculture"]
# id, x, y, priority. 2-wide buildings sit on x and x+1, 3-wide ones are centred on x. The room is x177-200, y120-123.
PLAN = [("Outhouse", 178, 120, 9), ("WashBasin", 181, 120, 8),
        ("ManualGenerator", 191, 120, 8), ("ResearchCenter", 193, 120, 8),
        *[("Wire", x, 120, 7) for x in range(191, 200)],
        ("Tile", 196, 119, 7), ("Tile", 199, 119, 7),
        ("Ladder", 190, 120, 6), ("Ladder", 190, 121, 6), ("Ladder", 190, 122, 6), ("Ladder", 190, 123, 6), ("Ladder", 190, 124, 6), ("Ladder", 190, 125, 6),
        ("Bed", 191, 125, 6), ("Bed", 193, 125, 6), ("Bed", 195, 125, 6),
        ("MineralDeoxidizer", 199, 120, 5)]
DIGS = [[x, y] for y in (124,) for x in (190,)] + [[x, y] for y in (125, 126) for x in range(190, 201)]   # the bedroom above


def log(*a): print(time.strftime("%H:%M:%S"), *a, flush=True)


def run(until):
    done, tries, last_cycle = set(), {}, None
    oni.cmd(op="dig", cells=DIGS, prio=6)
    while True:
        s = oni.state()
        if not s.get("inGame"): log("not in game", s.get("screens")); time.sleep(10); continue
        if s["paused"]: oni.cmd(op="speed", speed=2); log("unpaused")
        if s["cycle"] != last_cycle:
            last_cycle = s["cycle"]
            oni.cmd(op="camera", x=BASE[0], y=BASE[1], zoom=14); time.sleep(1)
            shot = HERE / "shots" / f"cycle-{s['cycle']:03d}.png"; shot.parent.mkdir(exist_ok=True)
            shutil.copy(oni.shot(), shot)
            row = {"cycle": s["cycle"], "dupes": len(s["dupes"]), "foodKcal": round(s["foodKcal"]), "research": s["research"],
                   "done": len(s["researchDone"]), "buildings": len(s["buildings"]),
                   "worst": min(((d["name"], round(d["breath"]), round(d["stress"]), round(d["kcal"])) for d in s["dupes"]), key=lambda d: d[1], default=None)}
            with open(HERE / "progress.jsonl", "a") as f: f.write(json.dumps(row) + "\n")
            log("cycle", row)
            if s["cycle"] > until or not s["dupes"]: return
        if not s["research"]:
            nxt = next((t for t in RESEARCH if t not in s["researchDone"]), None)
            if nxt: log("research", nxt, oni.cmd(op="research", tech=nxt))
        for item in PLAN:
            if item in done or tries.get(item, 0) > 40: continue
            r = oni.cmd(op="build", id=item[0], x=item[1], y=item[2], prio=item[3])
            if r.get("ok"): done.add(item); log("placed", item, r.get("mats"))
            else:
                tries[item] = tries.get(item, 0) + 1
                if tries[item] in (1, 41): log("waiting", item, r.get("error"))
        time.sleep(10)


if __name__ == "__main__":
    run(int(sys.argv[1]) if len(sys.argv) > 1 else 11)

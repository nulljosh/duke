"""End-of-day benchmark: log a progress row from live RAM, redraw the graph, forecast and wallpaper, print one line.
Treasures come from Poko (mTreasureCount counts other things too); pass the count when it is known.
  python3 bench.py DAY "note" [treasures]"""
import json
import subprocess
import sys
import time
import pk2

day, note = int(sys.argv[1]), sys.argv[2]
pd = pk2.u32(0x80516810)
poko = pk2.u32(pd + 0xE8)
rows = [json.loads(l) for l in open("progress.jsonl")]
tr = int(sys.argv[3]) if len(sys.argv) > 3 else rows[-1]["treasures"]
alive = pk2.alive() or rows[-1]["pikmin"]   # the results screen reads 0: keep the last field count
row = dict(t=int(time.time()), day=day, pikmin=alive, treasures=tr, poko=poko, pct=round(100 * tr / 201), note=note)
open("progress.jsonl", "a").write(json.dumps(row) + "\n")
for cmd in (["python3", "graph.py"], ["python3", "forecast.py"]):
    out = subprocess.run(cmd, capture_output=True, text=True).stdout.strip().splitlines()
    print(*out[-2:], sep="\n")
subprocess.run(["python3", "wallpaper.py", pk2.shot(f"day{day}-bench")], capture_output=True)
gaps = [b["t"] - a["t"] for a, b in zip(rows + [row], (rows + [row])[1:])]
hours = sum(min(g, 3600) for g in gaps) / 3600
print(f"BENCH day {day}: {tr}/201 treasures, {poko} Poko, {row['pikmin']} Pikmin, {tr / max(hours, 0.01):.2f} treasures/bot-hour")

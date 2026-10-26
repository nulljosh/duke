#!/usr/bin/env python3
"""Fold the gitignored lesson ledgers into courses/<code>.jsonl: one line per unique question, kept in the repo.
  python3 scripts/courses.py"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "courses"
OUT.mkdir(exist_ok=True)

seen = {}
for f in sorted(OUT.glob("*.jsonl")):   # keep what earlier runs saved; the local ledgers rotate
    for line in f.open():
        r = json.loads(line); seen.setdefault(f.stem, {})[(r["type"], r["prompt"])] = r["answer"]
for name in ("lessons.archive.jsonl", "lessons.jsonl"):
    p = HERE / name
    if not p.exists(): continue
    for line in p.open():
        try: r = json.loads(line)
        except ValueError: continue
        if r.get("course") and r.get("prompt") and r.get("answer"):
            seen.setdefault(r["course"], {})[(r.get("type") or "", r["prompt"])] = r["answer"]

for course, rows in seen.items():
    with (OUT / f"{course}.jsonl").open("w") as f:
        for (t, prompt), answer in sorted(rows.items()):
            f.write(json.dumps({"type": t, "prompt": prompt, "answer": answer}, ensure_ascii=False) + "\n")
print(", ".join(f"{c} {len(r)}" for c, r in sorted(seen.items(), key=lambda x: -len(x[1]))))

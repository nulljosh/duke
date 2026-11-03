"""Monte Carlo finish date for the Pikmin 2 run, from progress.jsonl and the milestone list in ROADMAP.md.
python3 forecast.py [out.png]   prints P10/P50/P90 bot hours to 201 treasures and draws the fan chart.

Model: each remaining treasure costs (observed minutes per treasure) x (learning factor) x (area difficulty) x noise.
Observed pace comes from the graph's own rows. The learning factor is uniform 0.15 to 0.5 because days 1 to 4
were mostly one-off setup (bags, gates, Onion, writing the bot). Noise is lognormal, sigma 0.6. Each Onion and
boss adds a fixed block sampled from 0.5 to 2 hours. Every new progress row sharpens it."""
import json, math, random, sys
from pathlib import Path

from PIL import Image, ImageDraw
from graph import BG, PANEL, INK, DIM, GRID, GOLD, RED, LEAF, font, sprout

HERE = Path(__file__).resolve().parent
# (milestone, treasures, difficulty, blockers): cave counts from PLAYBOOK.md where it has them, the rest from the
# standard 201 list; the overground split is not verified. Blockers are Onions, gates and bosses that cost time but give no treasure.
MILESTONES = [
    ("Valley of Repose overground", 4, 1.0, 0), ("Emergence Cave", 2, 1.0, 0), ("Awakening Wood overground", 7, 1.0, 1),
    ("Hole of Beasts", 5, 1.3, 1), ("White Flower Garden", 7, 1.3, 1), ("Bulblax Kingdom", 10, 1.5, 1),
    ("Snagret Hole", 15, 1.5, 1), ("Subterranean Complex", 9, 1.5, 1), ("Frontier Cavern", 15, 1.6, 1),
    ("Citadel of Spiders", 11, 1.5, 1), ("Glutton's Kitchen", 14, 1.6, 1), ("Shower Room", 13, 1.7, 1),
    ("Submerged Castle", 5, 2.0, 1), ("Cavern of Chaos", 13, 1.8, 1), ("Hole of Heroes", 12, 2.0, 1),
    ("Dream Den", 13, 2.2, 1), ("Pool and Wistful Wild overground", 46, 1.1, 1),
]
GOAL, RUNS = 201, 4000
assert sum(m[1] for m in MILESTONES) == GOAL


def rows():
    return [json.loads(l) for l in (HERE / "progress.jsonl").read_text().splitlines()]


def simulate(done, pace, rng):
    """One run: cumulative (hours, treasures) through every milestone still open."""
    left, t, got, path = done, 0.0, done, [(0.0, done)]
    for _, n, diff, block in MILESTONES:
        take = min(n, max(0, left)); left -= take
        learn = rng.uniform(0.15, 0.5)
        for _ in range(n - take):
            t += pace * learn * diff * rng.lognormvariate(0, 0.6) / 60
            got += 1
        if n - take:
            t += block * rng.uniform(0.5, 2.0)
            path.append((t, got))
    return t, path


def black_scholes(data, T):
    """Option-pricing read of the run: P(201 treasures within T more bot hours) as a digital call, N(d).
    The treasure count is modelled as Brownian motion with drift (Bachelier, the arithmetic form of Black-Scholes):
    the lognormal form compounds 0 to 5 treasures into ~100% within a day, which is nonsense for a count that grows
    linearly. Drift and volatility come from the progress rows (treasures per bot hour), capped gaps as in main().
    ponytail: constant drift, so no learning curve; the Monte Carlo above carries that."""
    pts = [(min(b["t"] - a["t"], 3600) / 3600, b["treasures"] - a["treasures"]) for a, b in zip(data, data[1:])]
    pts = [(dt, dn) for dt, dn in pts if dt > 0.05]
    if len(pts) < 2:
        return 0.0, 0.0, 0.0
    mu = sum(dn for _, dn in pts) / sum(dt for dt, _ in pts)
    sig = max(math.sqrt(sum((dn - mu * dt) ** 2 / dt for dt, dn in pts) / (len(pts) - 1)), 1e-3)
    d = (data[-1]["treasures"] + mu * T - GOAL) / (sig * math.sqrt(T))
    return 0.5 * (1 + math.erf(d / math.sqrt(2))), mu, sig


def main(out):
    data = rows()
    gaps = [b["t"] - a["t"] for a, b in zip(data, data[1:])]
    hours = sum(min(g, 3600) for g in gaps) / 3600  # a long gap is mostly the bot parked; count at most 1 h of it
    done = data[-1]["treasures"]
    pace = hours * 60 / max(done, 1)                    # observed minutes per treasure, setup included
    rng = random.Random(7)
    sims = sorted((simulate(done, pace, rng) for _ in range(RUNS)), key=lambda s: s[0])
    p10, p50, p90 = (sims[int(RUNS * q)][0] for q in (0.1, 0.5, 0.9))
    print(f"{done}/{GOAL} treasures after {hours:.1f} h; pace {pace:.0f} min/treasure so far")
    print(f"bot hours to finish: P10 {p10:.0f}  P50 {p50:.0f}  P90 {p90:.0f}")
    p, mu, sig = black_scholes(data, p50)
    print(f"Black-Scholes: drift {mu:.2f} treasures/h, vol {sig:.2f}; median finish {(GOAL - done) / mu:.0f} bot h;"
          f" P(done by MC P50 {p50:.0f} h) {p:.0%}, P(by MC P90 {p90:.0f} h) {black_scholes(data, p90)[0]:.0%}")
    draw(out, sims, (p10, p50, p90), hours, done, (GOAL - done) / mu if mu > 0 else None)
    return p10, p50, p90


def draw(out, sims, ps, hours, done, bs=None):
    W, H = 960, 540
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    big, mid, small = font(40), font(24), font(18)
    sprout(d, 50, 40, 1.0, GOLD)
    d.text((76, 32), "Pikmin 2 finish forecast", font=big, fill=INK)
    d.text((76, 84), f"{done}/{GOAL} treasures  ·  P50 {ps[1]:.0f} more bot hours (P10 {ps[0]:.0f}, P90 {ps[2]:.0f})",
           font=mid, fill=DIM)
    x0, y0, x1, y1 = 80, 150, W - 60, H - 90
    d.rounded_rectangle([40, 136, W - 40, H - 76], 28, fill=PANEL)
    tmax = max(ps[2], bs or 0) * 1.08
    for v in range(0, GOAL + 1, 50):
        y = y1 - (y1 - y0) * v / GOAL
        d.line([(x0, y), (x1, y)], fill=GRID)
        d.text((x0 - 40, y - 10), str(v), font=small, fill=DIM)
    pt = lambda t, n: (x0 + (x1 - x0) * min(t, tmax) / tmax, y1 - (y1 - y0) * n / GOAL)
    for s in sims[::RUNS // 120]:                      # 120 sampled runs as a faint fan
        d.line([pt(*p) for p in s[1]], fill=(78, 96, 60), width=1)
    for q, w, name in ((0.1, 2, "P10"), (0.5, 5, "P50"), (0.9, 2, "P90")):
        path = sims[int(RUNS * q)][1]
        d.line([pt(*p) for p in path], fill=GOLD, width=w)
        if name == "P50":                      # P10 and P90 sit in the subtitle; three end labels collide
            x, y = pt(*path[-1])
            d.text((x - 40, y - 24), f"P50 {path[-1][0]:.0f}h", font=small, fill=GOLD)
    if bs:                                     # Black-Scholes (Bachelier) median: today's pace held flat, dashed
        BLUE = (110, 168, 255)
        n = 40
        for i in range(0, n, 2):
            a, b = i / n, (i + 1) / n
            d.line([pt(bs * a, done + (GOAL - done) * a), pt(bs * b, done + (GOAL - done) * b)], fill=BLUE, width=3)
        x, y = pt(bs, GOAL)
        d.text((x - 150, y + 6), f"Black-Scholes {bs:.0f}h", font=small, fill=BLUE)
    step = next(s for s in (10, 20, 25, 50, 100, 200) if tmax / s <= 6)
    for h in range(0, int(tmax) + 1, step):
        x, _ = pt(h, 0)
        d.text((x - 8, y1 + 6), f"{h}h" if h else "now", font=small, fill=DIM)
    d.text((40, H - 56), f"Monte Carlo, {RUNS:,} runs, from {hours:.1f} h of real play  ·  dashed: Black-Scholes at today's pace",
           font=font(20), fill=INK)
    img.save(out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else HERE / "forecast.png")

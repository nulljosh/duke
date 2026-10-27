"""Draw progress.svg from progress.jsonl (one line per finished day) in the game's own colours."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
BLACK, OLIVE, DARK, RED, CREAM = "#000000", "#4b5e4c", "#293229", "#c41430", "#e0e3b9"
W, H, L, R, T, B = 960, 420, 70, 30, 110, 60   # canvas and plot margins
DAYS = 31


def svg(rows):
    pw, ph = W - L - R, H - T - B
    bw = pw / DAYS
    top = max([r["entrants"] for r in rows] + [10])
    mtop = max([r["money"] for r in rows] + [50])
    x = lambda d: L + (d - 1) * bw
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="-apple-system, Helvetica, sans-serif">',
           f'<rect width="{W}" height="{H}" fill="{BLACK}"/>',
           f'<rect x="{L - 20}" y="22" width="{W - L - R + 40}" height="44" fill="{OLIVE}"/>',
           f'<text x="{W / 2}" y="52" fill="{CREAM}" font-size="22" font-weight="800" text-anchor="middle" letter-spacing="4">GRESTIN BORDER CHECKPOINT</text>',
           f'<text x="{L}" y="92" fill="{CREAM}" font-size="13" letter-spacing="2">DAY {rows[-1]["day"] if rows else 0} OF {DAYS}  ·  FAMILY: {(rows[-1]["family"] if rows else "-").upper()}</text>',
           f'<text x="{W - R}" y="92" fill="{RED}" font-size="13" text-anchor="end" letter-spacing="2">■ CREDITS AT NIGHT</text>',
           f'<text x="{W - R - 200}" y="92" fill="{OLIVE}" font-size="13" text-anchor="end" letter-spacing="2">■ ENTRANTS</text>']
    for d in range(1, DAYS + 1):   # empty slots for the days still ahead
        out.append(f'<rect x="{x(d) + 2:.1f}" y="{T}" width="{bw - 4:.1f}" height="{ph}" fill="{DARK}" opacity="0.35"/>')
        if d % 5 == 1 or d == DAYS:
            out.append(f'<text x="{x(d) + bw / 2:.1f}" y="{H - B + 22}" fill="{CREAM}" font-size="12" text-anchor="middle">{d}</text>')
    for r in rows:
        h = ph * r["entrants"] / top
        out.append(f'<rect x="{x(r["day"]) + 2:.1f}" y="{T + ph - h:.1f}" width="{bw - 4:.1f}" height="{h:.1f}" fill="{OLIVE}"/>')
    pts = [(x(r["day"]) + bw / 2, T + ph - ph * r["money"] / mtop) for r in rows]
    if pts:
        out.append(f'<polyline points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in pts)}" fill="none" stroke="{RED}" stroke-width="3"/>')
        out += [f'<rect x="{a - 4:.1f}" y="{b - 4:.1f}" width="8" height="8" fill="{RED}"/>' for a, b in pts]
    out.append(f'<text x="{L}" y="{H - 14}" fill="{OLIVE}" font-size="12" letter-spacing="2">GLORY TO ARSTOTZKA</text></svg>')
    return "\n".join(out)


if __name__ == "__main__":
    rows = [json.loads(l) for l in (HERE / "progress.jsonl").read_text().splitlines() if l.strip()]
    (HERE / "progress.svg").write_text(svg(rows))
    print(f"progress.svg: {len(rows)} days")

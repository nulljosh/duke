"""The 31 days of Papers, Please as one map: map.svg. Done days come from progress.jsonl; EZIC choices and attacks from RULES.md."""
import json
from pathlib import Path

HERE = Path(__file__).parent
DAYS = {   # day: (what changes, what we must do), EZIC = an ending-20 choice, ATTACK = shooting starts
    1: ("Arstotzkans only", "open the border"), 2: ("Foreigners allowed", "first attack"), 3: ("Entry ticket", "Jorji, no papers"),
    4: ("Entry permit, ID card", "check seals by eye"), 5: ("Booth upgrade", "Vince: valid, approve"), 6: ("Work pass", "bomber at the wall"),
    7: ("Search Kolechians", "scanner installed"), 8: ("Diplomats", "EZIC: Corman Drex"), 9: ("MOI agent", "Calensk deal"),
    10: ("Dimitri visits", "EZIC decoder"), 11: ("Forgeries start", "deny Saratov, burn gift"), 12: ("Vonel gets nothing", "burn the 2,000"),
    13: ("ID supplement", "Hasse's pennant"), 14: ("Wanted list", "deny Graire"), 15: ("Bomb in the booth", "cut wires in order"),
    16: ("Tranq gun", "stop the climber"), 17: ("Cipher overlay", "deny Escalli"), 18: ("Reason stamp", "son's crayons, 25"),
    19: ("Impor banned", "detain Jorji"), 20: ("Hide the decor", "no poison, admit Istom"), 21: ("Asylum grants", "motorcycle attack"),
    22: ("Wanted list", "keep Lorun's watch"), 23: ("Man in red", "never shoot him"), 24: ("Altan seizures", "deny Jorji"),
    25: ("UF banned", "never detain Shae"), 26: ("Polio certificate", "admit Elisa"), 27: ("Access permit", "deny Kallo"),
    28: ("Seize all Arstotzkan", "stop the gunman"), 29: ("Audit notice", "Vonel gets nothing"), 30: ("Decor check again", "Wens and the father"),
    31: ("EZIC hits the wall", "hold it: ending 20"),
}
EZIC = {11, 12, 14, 17, 20, 27, 31}
ATTACK = {2, 6, 15, 16, 18, 21, 23, 26, 28, 31}
DONE = {d for d in range(1, 10)} | {json.loads(l)["day"] for l in (HERE / "progress.jsonl").read_text().splitlines() if l.strip()}
NOW = max(DONE) + 1

BG, INK, MUTE, LINE, RED, ORANGE, PAPER = "#141012", "#efe6d8", "#8c8078", "#3a3134", "#e8564e", "#e8691a", "#d9cdb4"
W, COLS, CW, RH, X0, Y0 = 1280, 8, 150, 168, 115, 190


def pos(d):
    r, c = divmod(d - 1, COLS)
    if r % 2: c = COLS - 1 - c   # the road snakes back and forth like the queue
    return X0 + c * CW, Y0 + r * RH


def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;")


out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="900" viewBox="0 0 {W} 900" font-family="Menlo, monospace">',
       f'<rect width="{W}" height="900" fill="{BG}"/>',
       f'<text x="60" y="70" fill="{INK}" font-size="30" font-weight="700">Glory to Arstotzka, 31 days</text>',
       f'<text x="60" y="102" fill="{MUTE}" font-size="15">Duke\'s route through Papers, Please to ending 20: refuse every EZIC task, burn both gifts, hold the wall.</text>',
       f'<text x="60" y="126" fill="{MUTE}" font-size="15">{len(DONE)} of 31 days done. Day {NOW} is on the booth now.</text>']
def road(last):   # each row turns outside the end column, clear of the labels
    pts = []
    for d in range(1, last + 1):
        x, y = pos(d); pts.append((x, y))
        if d % COLS == 0 and d < last:
            side = 70 if (d // COLS) % 2 else -70
            nx, ny = pos(d + 1); pts += [(x + side, y), (nx + side, ny)]
    return pts
pts, done_pts = road(31), road(NOW)
out.append(f'<polyline points="{" ".join(f"{x},{y}" for x, y in pts)}" fill="none" stroke="{LINE}" stroke-width="6" stroke-linejoin="round"/>')
out.append(f'<polyline points="{" ".join(f"{x},{y}" for x, y in done_pts)}" fill="none" stroke="{RED}" stroke-width="6" stroke-linejoin="round"/>')
for d, (a, b) in DAYS.items():
    x, y = pos(d)
    done, now = d in DONE, d == NOW
    fill = RED if done else (ORANGE if now else BG)
    stroke = ORANGE if now else (RED if done else (PAPER if d in EZIC else LINE))
    if now: out.append(f'<circle cx="{x}" cy="{y}" r="27" fill="none" stroke="{ORANGE}" stroke-width="2"/>')
    out.append(f'<circle cx="{x}" cy="{y}" r="20" fill="{fill}" stroke="{stroke}" stroke-width="3"/>')
    out.append(f'<text x="{x}" y="{y + 6}" text-anchor="middle" fill="{BG if done or now else INK}" font-size="16" font-weight="700">{d}</text>')
    tags = []
    if d in EZIC: tags.append(("EZIC", PAPER))
    if d in ATTACK: tags.append(("ATTACK", ORANGE))
    for i, (t, col) in enumerate(tags):   # tags above the node
        cx = x + (i - (len(tags) - 1) / 2) * 66
        out.append(f'<rect x="{cx - 30}" y="{y - 52}" width="60" height="17" rx="2" fill="none" stroke="{col}" stroke-width="1.2"/>')
        out.append(f'<text x="{cx}" y="{y - 39.5}" text-anchor="middle" fill="{col}" font-size="10.5" font-weight="700">{t}</text>')
    dim = INK if not done else MUTE
    out.append(f'<text x="{x}" y="{y + 44}" text-anchor="middle" fill="{dim}" font-size="12.5" font-weight="700">{esc(a)}</text>')
    out.append(f'<text x="{x}" y="{y + 61}" text-anchor="middle" fill="{MUTE}" font-size="12">{esc(b)}</text>')
ly = 860
for i, (label, swatch) in enumerate([("done", RED), ("today", ORANGE), ("to come", BG)]):
    lx = 60 + i * 150
    out.append(f'<circle cx="{lx}" cy="{ly - 5}" r="8" fill="{swatch}" stroke="{LINE if swatch == BG else swatch}" stroke-width="2"/>')
    out.append(f'<text x="{lx + 16}" y="{ly}" fill="{MUTE}" font-size="13">{label}</text>')
out.append(f'<text x="520" y="{ly - 10}" fill="{MUTE}" font-size="13">EZIC: a choice that decides the ending.  ATTACK: a gun or bomb day.</text>')
out.append(f'<text x="520" y="{ly + 10}" fill="{MUTE}" font-size="13">Lose it all: take a gift, hand Vonel anything, shoot the man in red.</text>')
out.append('</svg>')
(HERE / "map.svg").write_text("\n".join(out))
print(f"map.svg: {len(DONE)} done, day {NOW} now")

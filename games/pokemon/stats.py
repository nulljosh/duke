"""One progress row from RAM, appended to progress.jsonl. Offsets are pokeruby's include/global.h."""
import json
import time
from pathlib import Path

import mons
import nav

HERE = Path(__file__).resolve().parent
SB1, SB2 = 0x02025734, 0x02024EA4
def pretty(grp, num):
    """The decomp's map name, readable: GraniteCave_1F -> Granite Cave, Route104_MrBrineysHouse -> Route 104."""
    import re
    import world
    base = world.NAMES.get(f"{grp}.{num}", "?").split("_")[0]
    return re.sub(r"(?<=[a-z])(?=[A-Z0-9])", " ", base).replace("Town", "").replace("City", "").strip()


def snapshot(g, note=""):
    sb2 = g.read(SB2, 0x5C)
    flags = g.read(SB1 + 0x1220 + 0x100, 2)                   # FLAG_BADGE01_GET is flag 0x807
    badges = bin(((flags[0] >> 7) | (flags[1] << 1)) & 0xFF).count("1")
    party = mons.party(g)
    x, y, grp, num = nav.where(g)
    return dict(
        t=int(time.time()),
        playMin=int.from_bytes(sb2[0x0E:0x10], "little") * 60 + sb2[0x10],
        place=pretty(grp, num),
        map=f"{grp}.{num}", badges=badges,
        caught=sum(bin(b).count("1") for b in sb2[0x28:0x5C]),  # gSaveBlock2.pokedex.owned
        money=g.r32(SB1 + 0x490),
        party=[[m["name"], m["level"]] for m in party],
        note=note,
    )


def log(g, note=""):
    row = snapshot(g, note)
    with open(HERE / "progress.jsonl", "a") as f:
        f.write(json.dumps(row) + "\n")
    return row


if __name__ == "__main__":
    import sys
    import pk
    print(log(pk.GBA(), " ".join(sys.argv[1:])))

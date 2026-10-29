"""Party reader. Gen 3 box data is 4 substructs (Growth, Attacks, EVs, Misc) of 12 bytes, shuffled by
personality % 24 and XORed with otId ^ personality (pokeruby's pokemon.c, same as mGBA's pokemon.lua)."""
PARTY, COUNT = 0x03004360, 0x03004350  # gPlayerParty (6 x 100 bytes), gPlayerPartyCount
ORDERS = ["GAEM", "GAME", "GEAM", "GEMA", "GMAE", "GMEA", "AGEM", "AGME", "AEGM", "AEMG", "AMGE", "AMEG",
          "EGAM", "EGMA", "EAGM", "EAMG", "EMGA", "EMAG", "MGAE", "MGEA", "MAGE", "MAEG", "MEGA", "MEAG"]
NAMES = 0x081F7114                     # gSpeciesNames, 11 bytes each
_species = {}


def text(b):
    """Gen 3 charset: A-Z 0xBB, a-z 0xD5, 0-9 0xA1, space 0, 0xFF ends."""
    out = ""
    for c in b:
        if c == 0xFF:
            break
        out += (chr(c - 0xBB + 65) if 0xBB <= c <= 0xD4 else chr(c - 0xD5 + 97) if 0xD5 <= c <= 0xEE
                else chr(c - 0xA1 + 48) if 0xA1 <= c <= 0xAA else {0: " ", 0xAE: "-", 0xAD: ".", 0x1B: "e",
                0xB5: "M", 0xB6: "F"}.get(c, "?"))
    return out


def species(g, sid):
    if sid not in _species:
        _species[sid] = text(g.read(NAMES + sid * 11, 11))
    return _species[sid]


def u(b, i, n):
    return int.from_bytes(b[i:i + n], "little")


def decode(b, g=None):
    pid, ot = u(b, 0, 4), u(b, 4, 4)
    key = pid ^ ot
    data = b"".join((u(b, 32 + i, 4) ^ key).to_bytes(4, "little") for i in range(0, 48, 4))
    sub = {k: data[i * 12:i * 12 + 12] for i, k in enumerate(ORDERS[pid % 24])}
    gr, a = sub["G"], sub["A"]
    sp = u(gr, 0, 2)
    return dict(species=sp, name=species(g, sp) if g else sp, exp=u(gr, 4, 4),
                moves=[u(a, i, 2) for i in (0, 2, 4, 6)], pp=list(a[8:12]),
                level=b[84], hp=u(b, 86, 2), maxhp=u(b, 88, 2), atk=u(b, 90, 2), dfn=u(b, 92, 2),
                spd=u(b, 94, 2), spa=u(b, 96, 2), spdef=u(b, 98, 2))


def party(g):
    n = g.r8(COUNT)
    raw = g.read(PARTY, 600)
    return [decode(raw[i * 100:i * 100 + 100], g) for i in range(n)]


if __name__ == "__main__":
    import pk
    for m in party(pk.GBA()):
        print(m)

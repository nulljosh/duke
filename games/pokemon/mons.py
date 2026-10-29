"""Party reader. Gen 3 box data is 4 substructs (Growth, Attacks, EVs, Misc) of 12 bytes, shuffled by
personality % 24 and XORed with otId ^ personality (pokeruby's pokemon.c, same as mGBA's pokemon.lua)."""
PARTY, COUNT = 0x03004360, 0x03004350  # gPlayerParty (6 x 100 bytes), gPlayerPartyCount
ORDERS = ["GAEM", "GAME", "GEAM", "GEMA", "GMAE", "GMEA", "AGEM", "AGME", "AEGM", "AEMG", "AMGE", "AMEG",
          "EGAM", "EGMA", "EAGM", "EAMG", "EMGA", "EMAG", "MGAE", "MGEA", "MAGE", "MAEG", "MEGA", "MEAG"]
SPECIES = {277: "Treecko", 280: "Torchic", 283: "Mudkip", 286: "Poochyena", 288: "Zigzagoon", 290: "Wurmple"}


def u(b, i, n):
    return int.from_bytes(b[i:i + n], "little")


def decode(b):
    pid, ot = u(b, 0, 4), u(b, 4, 4)
    key = pid ^ ot
    data = b"".join((u(b, 32 + i, 4) ^ key).to_bytes(4, "little") for i in range(0, 48, 4))
    sub = {k: data[i * 12:i * 12 + 12] for i, k in enumerate(ORDERS[pid % 24])}
    g, a = sub["G"], sub["A"]
    species = u(g, 0, 2)
    return dict(species=species, name=SPECIES.get(species, species), exp=u(g, 4, 4),
                moves=[u(a, i, 2) for i in (0, 2, 4, 6)], pp=list(a[8:12]),
                level=b[84], hp=u(b, 86, 2), maxhp=u(b, 88, 2), atk=u(b, 90, 2), dfn=u(b, 92, 2),
                spd=u(b, 94, 2), spa=u(b, 96, 2), spdef=u(b, 98, 2))


def party(g):
    n = g.r8(COUNT)
    raw = g.read(PARTY, 600)
    return [decode(raw[i * 100:i * 100 + 100]) for i in range(n)]


if __name__ == "__main__":
    import pk
    for m in party(pk.GBA()):
        print(m)

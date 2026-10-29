"""Pellet and item managers read straight from RAM. Split out of pk2.py; pk2 re-exports everything here."""
from pk2 import read, u32


PELLET_MGRS = {"number": 0x80516878, "treasure": 0x805168A0, "item": 0x805168A8, "fruit": 0x80516890, "carcass": 0x80516880}


def pellets(kind="treasure"):
    """Live pellets of one kind: FixedSizePelletMgr's MonoObjectMgr at +0x70 (+0x24 max, +0x28 array, +0x2C mOpenIds,
    0 = in use); Pellet mPelletPosition +0x3AC, mMinCarriers +0x3D8, mMaxCarriers +0x3DC. Stride by vtable repeat."""
    import struct
    m = u32(PELLET_MGRS[kind]) + 0x70
    mx, arr, opn = struct.unpack(">3I", read(m + 0x24, 12))
    if not mx:
        return []
    vt = read(arr, 4)
    blob = b"".join(read(arr + i, 4000) for i in range(0, 12000, 4000))
    stride = next(k for k in range(0x3E0, len(blob) - 4, 4) if blob[k:k + 4] == vt)
    free = read(opn, mx)
    out = []
    for i in range(mx):
        if free[i] == 0:
            b = read(arr + i * stride + 0x3AC, 0x34)
            x, y, z = struct.unpack(">3f", b[:12])
            lo, hi = struct.unpack(">2i", b[0x2C:0x34])
            out.append(dict(i=i, x=x, y=y, z=z, min=lo, max=hi))
    return out


ITEM_MGRS = {"cave": 0x80516820, "gate": 0x805167B0, "downfloor": 0x80516860, "bridge": 0x80516838}


def items(kind):
    """Live x, z of one TNodeItemMgr's items (caves, gates, bags, bridges): the first TObjectNode in the mgr,
    then +0x04 next, +0x18 the item, BaseItem mPosition +0x19C. Found by walking the list 2026-10-29."""
    import struct
    m = u32(ITEM_MGRS[kind])
    node = next((u32(m + o) for o in range(0x4C, 0xC0, 4)
                 if 0x80000000 <= u32(m + o) < 0x81800000 and u32(m + o) != m
                 and u32(u32(m + o)) in range(0x804A0000, 0x804C0000) and 0x80000000 <= u32(u32(m + o) + 0x18) < 0x81800000), 0)
    out, seen = [], set()
    while 0x80000000 <= node < 0x81800000 and node not in seen:
        seen.add(node)
        x, _, z = struct.unpack(">3f", read(u32(node + 0x18) + 0x19C, 12))
        out.append((x, z))
        node = u32(node + 0x04)
    return out

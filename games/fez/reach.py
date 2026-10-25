#!/usr/bin/env python3
"""reach.py LEVEL VIEW COL Y DEPTH: every spot the planner can reach from a start, summarised by height."""
import sys, collections
import plan, fezmap


def reach(name, view, start):
    grids = {v: plan.grid(name, v) for v in plan.ORDER}; lo = min(y for g in grids.values() for _, y in g) - 1
    s0 = (view, *start); seen = {s0}; q = [s0]
    while q:
        v, c, y, dep = q.pop()
        plan.FLATNOW = plan.FLAT[(name, v)]
        nxt = [(v, c2, y2, d2 if d2 is not None else plan.settle_depth(name, v, c2, y2, dep)) for (k, c2, y2, d2), _ in plan.moves(grids[v], c, y, lo, plan.CLIMB[(name, v)], dep)]
        if plan.standable(grids[v], c, y):
            hi, hs, di, _ = fezmap.VIEWS[v]; pos = [0, 0, 0]; pos[hi] = (c + .5) * hs; pos[di] = dep + .5
            for st in (1, -1):
                nv = plan.ORDER[(plan.ORDER.index(v) + st) % 4]; nhi, nhs, ndi, _ = fezmap.VIEWS[nv]
                nc, nd = int(pos[nhi] * nhs // 1), int(pos[ndi] // 1)
                if plan.standable(grids[nv], nc, y): nxt.append((nv, nc, y, nd))
        for n in nxt:
            if n not in seen: seen.add(n); q.append(n)
    return seen


if __name__ == "__main__":
    S = reach(sys.argv[1], sys.argv[2], tuple(int(float(a) // 1) for a in sys.argv[3:6]))
    by = collections.defaultdict(set)
    for v, c, y, d in S: by[y].add((v[0], c))
    for y in sorted(by): print(y, sorted(by[y])[:14], "..." if len(by[y]) > 14 else "")

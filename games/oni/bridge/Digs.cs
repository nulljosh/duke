// Safe digging and wild plants. Colony 1 lost a dupe to a pit and a flood, colony 2 lost its musher to a dig under its
// floor, so every dig goes through one filter: reachable, no liquid next to it, nothing built on it or above it, and
// never below the floor line the caller names (a dupe that drops into a pit with no ladder never climbs out).
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEngine;

public static partial class Ops
{
    static bool Wet(int cell)
    {
        for (int dx = -1; dx <= 1; dx++)
            for (int dy = -1; dy <= 1; dy++) { int c = Grid.OffsetCell(cell, dx, dy); if (Grid.IsValidCell(c) && Grid.Element[c].IsLiquid) return true; }
        return false;
    }

    static bool Built(int cell) => Grid.Objects[cell, (int)ObjectLayer.Building] != null || Grid.Objects[cell, (int)ObjectLayer.FoundationTile] != null;

    // {"cells": [[x, y], ...], "floor": 119, "prio": 5, "max": 15}: dig the safe ones, nearest first as given.
    static object SafeDig(JObject j)
    {
        int floor = (int?)j["floor"] ?? int.MinValue, max = (int?)j["max"] ?? 999, prio = (int?)j["prio"] ?? 5, n = 0;
        var navs = Components.LiveMinionIdentities.Items.Select(m => m.GetComponent<Navigator>()).Where(v => v != null).ToList();
        var why = new Dictionary<string, int>();
        foreach (var c in j["cells"])
        {
            if (n >= max) break;
            int x = (int)c[0], y = (int)c[1], cell = Grid.XYToCell(x, y);
            string bad = !Grid.Solid[cell] ? "open" : y <= floor ? "floor" : Built(cell) || Built(Grid.CellAbove(cell)) ? "built" : Wet(cell) ? "wet"
                : !navs.Any(v => v.CanReach(cell, Around)) ? "unreachable" : null;
            if (bad != null) { why[bad] = why.TryGetValue(bad, out var k) ? k + 1 : 1; continue; }
            var dig = DigTool.PlaceDig(cell, 0); if (dig == null) continue; n++;
            dig.GetComponent<Prioritizable>()?.SetMasterPriority(new PrioritySetting(PriorityScreen.PriorityClass.basic, prio));
        }
        return new { ok = true, placed = n, skipped = why };
    }

    // Wild plants by species with where they stand; {"op": "uproot", "cells": [...]} marks those for uprooting (seeds).
    static object Plants() => Components.Uprootables.Items.Where(u => u != null).Select(u => { var p = Grid.CellToXY(Grid.PosToCell(u)); return new object[] { u.name, p.x, p.y }; }).ToArray();

    static object Uproot(JObject j)
    {
        var want = new HashSet<int>(j["cells"].Select(c => Grid.XYToCell((int)c[0], (int)c[1]))); int n = 0;
        foreach (var u in Components.Uprootables.Items) if (u != null && want.Contains(Grid.PosToCell(u))) { u.MarkForUproot(false); n++; }
        return new { ok = true, marked = n };
    }
}

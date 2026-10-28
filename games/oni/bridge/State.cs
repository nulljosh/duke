// The colony as one JSON object: cycle, dupes and their vitals, stock, buildings, research. GET /state.
using System;
using System.Collections.Generic;
using System.Linq;
using HarmonyLib;
using UnityEngine;

public static partial class Ops
{
    static bool InGame => Game.Instance != null && SaveLoader.Instance != null && ClusterManager.Instance != null && ClusterManager.Instance.activeWorld != null;

    public static object State()
    {
        var screens = new[] { "MainMenu", "ColonyDestinationSelectScreen", "MinionSelectScreen", "ImmigrantScreen", "VideoScreen", "InfoDialogScreen", "ConfirmDialogScreen" }
            .Where(n => { var t = AccessTools.TypeByName(n); return t != null && UnityEngine.Object.FindObjectsOfType(t).Cast<Component>().Any(c => c.gameObject.activeInHierarchy); }).ToArray();
        if (!InGame) return new { inGame = false, screens };
        var inv = ClusterManager.Instance.activeWorld.worldInventory;
        var db = Db.Get();
        var dupes = Components.LiveMinionIdentities.Items.Select(m =>
        {
            var go = m.gameObject; int cell = Grid.PosToCell(go);
            Func<Klei.AI.Amount, float> v = a => a.Lookup(go)?.value ?? -1;
            var chore = go.GetComponent<ChoreDriver>()?.GetCurrentChore();
            return new
            {
                name = m.GetProperName(), x = Grid.CellToXY(cell).x, y = Grid.CellToXY(cell).y,
                kcal = v(db.Amounts.Calories) / 1000f, stress = v(db.Amounts.Stress), breath = v(db.Amounts.Breath),
                hp = v(db.Amounts.HitPoints), bladder = v(db.Amounts.Bladder), stamina = v(db.Amounts.Stamina),
                chore = chore?.choreType.Id, air = Grid.Element[cell].id.ToString(), airMass = Grid.Mass[cell],
            };
        }).ToArray();
        var pod = Components.Telepads.Items.FirstOrDefault();
        var podXY = pod != null ? Grid.CellToXY(Grid.PosToCell(pod)) : new Vector2I(-1, -1);
        var have = new Dictionary<string, float>();
        foreach (var e in ElementLoader.elements)
        {
            float a = inv.GetAmount(e.tag, false);
            if (a > 0.5f) have[e.id.ToString()] = (float)Math.Round(a, 1);
        }
        var buildings = Components.BuildingCompletes.Items.Where(b => b != null && b.GetMyWorldId() == ClusterManager.Instance.activeWorldId)
            .Select(b => { var c = Grid.CellToXY(Grid.PosToCell(b)); return new object[] { b.Def.PrefabID, c.x, c.y, b.GetComponent<Operational>()?.IsOperational ?? true }; }).ToArray();
        int pending = UnityEngine.Object.FindObjectsOfType<Constructable>().Length;
        var tech = Research.Instance.GetActiveResearch();
        return new
        {
            inGame = true, screens, cycle = GameClock.Instance.GetCycle() + 1, cycleFrac = GameClock.Instance.GetTimeSinceStartOfCycle() / 600f,
            speed = SpeedControlScreen.Instance.GetSpeed(), paused = SpeedControlScreen.Instance.IsPaused,
            width = Grid.WidthInCells, height = Grid.HeightInCells, pod = new[] { podXY.x, podXY.y },
            immigrants = Immigration.Instance.ImmigrantsAvailable,
            foodKcal = WorldResourceAmountTracker<RationTracker>.Get().CountAmount(null, inv, true) / 1000f,   // the number the game's food meter shows
            research = tech?.tech.Id, researchDone = db.Techs.resources.Where(t => t.IsComplete()).Select(t => t.Id).ToArray(),
            dupes, have, buildings, pending,
        };
    }
}

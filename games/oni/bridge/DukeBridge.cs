// Duke's bridge into Oxygen Not Included: an HTTP server on 127.0.0.1:8741 that reads the colony and places orders the
// way a player would (dig and build blueprints, research, speed). Dupes still do all the work. GET /state, POST /cmd
// with a JSON body {"op": ...}. Requests are handled on Unity's main thread, one frame at a time.
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using HarmonyLib;
using KMod;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using UnityEngine;

public class DukeBridge : UserMod2
{
    internal static readonly ConcurrentQueue<KeyValuePair<HttpListenerContext, string>> Inbox = new ConcurrentQueue<KeyValuePair<HttpListenerContext, string>>();

    public override void OnLoad(Harmony harmony)
    {
        base.OnLoad(harmony);
        Application.runInBackground = true;   // keeps simulating behind Joshua's windows
        var l = new HttpListener();
        l.Prefixes.Add("http://127.0.0.1:8741/");
        l.Start();
        new Thread(() =>
        {
            while (true)
            {
                var c = l.GetContext();
                using (var r = new StreamReader(c.Request.InputStream)) Inbox.Enqueue(new KeyValuePair<HttpListenerContext, string>(c, r.ReadToEnd()));
            }
        }) { IsBackground = true }.Start();
        var go = new GameObject("DukeBridge");
        UnityEngine.Object.DontDestroyOnLoad(go);
        go.AddComponent<DukePump>();
    }
}

public class DukePump : MonoBehaviour
{
    float nextHide;

    void Update()
    {
        if (Time.unscaledTime > nextHide) { nextHide = Time.unscaledTime + 5f; try { Headless.Apply(); } catch (Exception) { } }   // Unity remakes its window on resolution changes
        while (DukeBridge.Inbox.TryDequeue(out var job))
        {
            string reply;
            try
            {
                var path = job.Key.Request.Url.AbsolutePath;
                reply = JsonConvert.SerializeObject(path == "/state" ? Ops.State() : Ops.Run(JObject.Parse(job.Value)));
            }
            catch (Exception e) { reply = JsonConvert.SerializeObject(new { error = e.ToString() }); }
            var b = Encoding.UTF8.GetBytes(reply);
            try { job.Key.Response.ContentType = "application/json"; job.Key.Response.OutputStream.Write(b, 0, b.Length); job.Key.Response.Close(); }
            catch (Exception) { }
        }
    }
}

public static partial class Ops
{
    static readonly CellOffset[] Around = { new CellOffset(-1, 0), new CellOffset(1, 0), new CellOffset(0, -1), new CellOffset(0, 1),
        new CellOffset(-1, -1), new CellOffset(1, -1), new CellOffset(-1, 1), new CellOffset(1, 1), new CellOffset(0, -2), new CellOffset(-1, -2), new CellOffset(1, -2) };   // where a digger can stand

    public static object Run(JObject j)
    {
        string op = (string)j["op"];
        switch (op)
        {
            case "invoke":   // menus: {"type": "MainMenu", "method": "NewGame"} on the live screen of that type
            {
                var t = AccessTools.TypeByName((string)j["type"]);
                var o = UnityEngine.Object.FindObjectsOfType(t).Cast<Component>().FirstOrDefault(c => c.gameObject.activeInHierarchy) ?? (UnityEngine.Object.FindObjectOfType(t) as Component);
                if (o == null) return new { error = "no live " + t };
                var r = AccessTools.Method(t, (string)j["method"]).Invoke(o, j["args"]?.ToObject<object[]>() ?? new object[0]);
                return new { ok = true, result = r?.ToString() };
            }
            case "grid":   // {"x0","y0","x1","y1"}: rows top to bottom, one short code per cell; legend maps code to element
            {
                int x0 = (int)j["x0"], y0 = (int)j["y0"], x1 = (int)j["x1"], y1 = (int)j["y1"];
                var legend = new Dictionary<string, string>(); var codes = new Dictionary<SimHashes, string>(); var rows = new List<string>();
                for (int y = y1; y >= y0; y--)
                {
                    var sb = new StringBuilder();
                    for (int x = x0; x <= x1; x++)
                    {
                        int cell = Grid.XYToCell(x, y);
                        if (!Grid.IsValidCell(cell)) { sb.Append(' '); continue; }
                        if (!Grid.IsVisible(cell)) { sb.Append('?'); continue; }
                        if (Grid.Objects[cell, (int)ObjectLayer.Building] != null) { sb.Append('#'); continue; }
                        var e = Grid.Element[cell];
                        if (!codes.TryGetValue(e.id, out var code))
                        {
                            const string pool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                            code = pool[codes.Count % pool.Length].ToString(); codes[e.id] = code; legend[code] = e.id + (e.IsSolid ? " solid" : e.IsLiquid ? " liquid" : " gas");
                        }
                        sb.Append(code);
                    }
                    rows.Add(sb.ToString());
                }
                return new { x0, y1, rows, legend };
            }
            case "dig":   // {"cells": [[x, y], ...]}
            {
                int n = 0;
                foreach (var c in j["cells"])
                {
                    int cell = Grid.XYToCell((int)c[0], (int)c[1]); if (!Grid.Solid[cell]) continue;
                    var dig = DigTool.PlaceDig(cell, 0); if (dig == null) continue; n++;
                    if (j["prio"] != null) dig.GetComponent<Prioritizable>()?.SetMasterPriority(new PrioritySetting(PriorityScreen.PriorityClass.basic, (int)j["prio"]));
                }
                return new { ok = true, placed = n };
            }
            case "build":   // {"id": "Ladder", "x", "y", "orient"?: "R90"}: a blueprint in the best material we have
            {
                var def = Assets.GetBuildingDef((string)j["id"]);
                if (def == null) return new { error = "no building " + j["id"] };
                int cell = Grid.XYToCell((int)j["x"], (int)j["y"]);
                var orient = j["orient"] != null ? (Orientation)Enum.Parse(typeof(Orientation), (string)j["orient"]) : Orientation.Neutral;
                if (!def.IsValidPlaceLocation(null, cell, orient, out string why)) return new { error = why };
                var mats = Materials(def);
                if (mats == null) return new { error = "not enough material for " + def.PrefabID };
                var go = def.TryPlace(null, Grid.CellToPosCBC(cell, def.SceneLayer), orient, mats, "DEFAULT_FACADE", 0);
                if (go != null && j["prio"] != null) go.GetComponent<Prioritizable>()?.SetMasterPriority(new PrioritySetting(PriorityScreen.PriorityClass.basic, (int)j["prio"]));
                return go != null ? (object)new { ok = true, mats = mats.Select(t => t.Name) } : new { error = "TryPlace failed" };
            }
            case "camera":   // {"x", "y", "zoom"?}: centre the view on a cell, for the cycle screenshots
                CameraController.Instance.SnapTo(Grid.CellToPosCCC(Grid.XYToCell((int)j["x"], (int)j["y"]), Grid.SceneLayer.Background), (float?)j["zoom"] ?? 12f);
                return new { ok = true };
            case "status":   // {"x", "y"}: the status lines the game shows for whatever stands on that cell
            {
                int cell = Grid.XYToCell((int)j["x"], (int)j["y"]); var lines = new List<string>();
                foreach (var layer in new[] { ObjectLayer.Building, ObjectLayer.Wire, ObjectLayer.FoundationTile, ObjectLayer.Minion })
                {
                    var go = Grid.Objects[cell, (int)layer]; var sel = go?.GetComponent<KSelectable>(); if (sel == null) continue;
                    foreach (StatusItemGroup.Entry e in sel.GetStatusItemGroup()) lines.Add(go.name + ": " + e.item.GetName(e.data));
                }
                return lines;
            }
            case "cancel":   // {"cells": [[x, y], ...]}: drop blueprints and dig orders there, like the Cancel tool
            {
                int n = 0;
                foreach (var c in j["cells"])
                {
                    int cell = Grid.XYToCell((int)c[0], (int)c[1]);
                    foreach (var layer in new[] { ObjectLayer.Building, ObjectLayer.DigPlacer, ObjectLayer.FoundationTile })
                    {
                        var go = Grid.Objects[cell, (int)layer];
                        if (go != null && (layer == ObjectLayer.DigPlacer || go.GetComponent<Constructable>() != null)) { go.Trigger((int)GameHashes.Cancel, null); n++; }
                    }
                }
                return new { ok = true, cancelled = n };
            }
            case "link":   // {"cells": [[x, y], ...], "util"?: "power"|"gas"|"liquid"}: join each wire or pipe cell to its listed
            {              // neighbours, the way a drag would. Pieces placed one at a time join nothing.
                var mgr = (string)j["util"] == "gas" ? Game.Instance.gasConduitSystem : (string)j["util"] == "liquid" ? Game.Instance.liquidConduitSystem : (IUtilityNetworkMgr)Game.Instance.electricalConduitSystem;
                var set = new HashSet<int>(j["cells"].Select(c => Grid.XYToCell((int)c[0], (int)c[1])));
                foreach (int cell in set)
                {
                    UtilityConnections m = 0;
                    if (set.Contains(Grid.CellLeft(cell))) m |= UtilityConnections.Left;
                    if (set.Contains(Grid.CellRight(cell))) m |= UtilityConnections.Right;
                    if (set.Contains(Grid.CellAbove(cell))) m |= UtilityConnections.Up;
                    if (set.Contains(Grid.CellBelow(cell))) m |= UtilityConnections.Down;
                    mgr.AddConnection(m, cell, true); mgr.AddConnection(m, cell, false);
                    foreach (var layer in new[] { ObjectLayer.Wire, ObjectLayer.WireConnectors, ObjectLayer.GasConduit, ObjectLayer.LiquidConduit })
                        Grid.Objects[cell, (int)layer]?.GetComponent<KAnimGraphTileVisualizer>()?.UpdateConnections(m);
                }
                mgr.ForceRebuildNetworks();
                return new { ok = true, cells = set.Count };
            }
            case "queue":   // {"x", "y", "result": "MushBar", "count"?: -1}: keep a fabricator making it; -1 is forever
            {
                var fab = Grid.Objects[Grid.XYToCell((int)j["x"], (int)j["y"]), (int)ObjectLayer.Building]?.GetComponent<ComplexFabricator>();
                if (fab == null) return new { error = "no fabricator there" };
                var recipes = fab.GetRecipes();
                var r = j["recipe"] != null ? recipes.FirstOrDefault(x => x.id == (string)j["recipe"])   // e.g. MicrobeMusher_I_Dirt_Water_O_MushBar
                    : recipes.FirstOrDefault(x => x.results.Any(o => o.material.Name == (string)j["result"]));
                if (r == null) return new { error = "no recipe", have = recipes.Select(x => x.id) };
                int n = (int?)j["count"] ?? -1;
                fab.SetRecipeQueueCount(r, n < 0 ? ComplexFabricator.QUEUE_INFINITE : n);
                return new { ok = true, recipe = r.id };
            }
            case "printables":   // open the Printing Pod's picker and list what it offers (dupes by name, care packages by item)
            {
                var screen = ImmigrantScreen.instance;
                if (screen == null || !screen.gameObject.activeInHierarchy) { ImmigrantScreen.InitializeImmigrantScreen(Components.Telepads.Items[0]); return new { ok = true, opened = true }; }
                var list = Traverse.Create(screen).Field("containers").GetValue<System.Collections.IList>();
                return list.Cast<object>().Select(c => c is CarePackageContainer cp ? "package " + Traverse.Create(cp).Field("info").Field("id").GetValue<string>() + " x" + Traverse.Create(cp).Field("info").Field("quantity").GetValue<float>()
                    : c is CharacterContainer cc ? "dupe " + Traverse.Create(cc).Field("stats").Field("Name").GetValue<string>() : c.ToString()).ToArray();
            }
            case "print":   // {"index"}: take that offer and print it
            {
                var screen = ImmigrantScreen.instance;
                var list = Traverse.Create(screen).Field("containers").GetValue<System.Collections.IList>();
                ((ITelepadDeliverableContainer)list[(int)j["index"]]).SelectDeliverable();
                AccessTools.Method(typeof(CharacterSelectionController), "OnProceed").Invoke(screen, new object[0]);
                return new { ok = true };
            }
            case "mop":   // {"cells": [[x, y], ...]}: mop up shallow liquid there
            {
                var m = AccessTools.Method(typeof(MopTool), "OnDragTool");
                foreach (var c in j["cells"]) m.Invoke(MopTool.Instance, new object[] { Grid.XYToCell((int)c[0], (int)c[1]), 0 });
                return new { ok = true };
            }
            case "plant":   // {"x", "y", "seed": "BasicPlantSeed"}: ask for that seed in the planter there (Mealwood is BasicPlantSeed)
            {
                var plot = Grid.Objects[Grid.XYToCell((int)j["x"], (int)j["y"]), (int)ObjectLayer.Building]?.GetComponent<PlantablePlot>();
                if (plot == null) return new { error = "no planter there" };
                plot.CreateOrder(new Tag((string)j["seed"]), Tag.Invalid);
                return new { ok = true };
            }
            case "window":   // {"show": true|false}: headless by default; show it to debug
                Headless.On = !(bool)j["show"]; return new { ok = true, windows = Headless.Apply() };
            case "shot":   // {"path"}: a PNG of the frame as the game drew it, UI included; written at the end of this frame
                if (File.Exists((string)j["path"])) File.Delete((string)j["path"]);
                ScreenCapture.CaptureScreenshot((string)j["path"]); return new { ok = true };
            case "prio":   // {"x", "y", "p"}: the errand priority of the building there, 1 to 9
            {
                var pr = Grid.Objects[Grid.XYToCell((int)j["x"], (int)j["y"]), (int)ObjectLayer.Building]?.GetComponent<Prioritizable>();
                if (pr == null) return new { error = "nothing prioritizable there" };
                pr.SetMasterPriority(new PrioritySetting(PriorityScreen.PriorityClass.basic, (int)j["p"])); return new { ok = true };
            }
            case "reach":   // {"cells": [[x, y], ...]}: those a dupe could dig from where it can walk (the dig tool's own offsets)
            {
                var navs = Components.LiveMinionIdentities.Items.Select(m => m.GetComponent<Navigator>()).Where(n => n != null).ToList();
                return j["cells"].Where(c => navs.Any(n => n.CanReach(Grid.XYToCell((int)c[0], (int)c[1]), Around))).ToArray();
            }
            case "speed": SpeedControlScreen.Instance.SetSpeed((int)j["speed"]); if ((bool?)j["play"] ?? true) SpeedControlScreen.Instance.Unpause(false); return new { ok = true };
            case "pause": SpeedControlScreen.Instance.Pause(false); return new { ok = true };
            case "research":
            {
                var tech = Db.Get().Techs.TryGet((string)j["tech"]);
                if (tech == null) return new { error = "no tech" };
                Research.Instance.SetActiveResearch(tech, true); return new { ok = true };
            }
            case "techs": return Db.Get().Techs.resources.Select(t => new { t.Id, done = t.IsComplete(), cost = t.costsByResearchTypeID, unlocks = t.unlockedItemIDs }).ToArray();
            case "buildable": return Assets.BuildingDefs.Where(d => d.ShowInBuildMenu && !d.Deprecated && (Db.Get().TechItems.TryGet(d.PrefabID)?.IsComplete() ?? true)).Select(d => new { d.PrefabID, d.WidthInCells, d.HeightInCells, mats = d.MaterialCategory, mass = d.Mass }).ToArray();
            default: return new { error = "unknown op " + op };
        }
    }

    // For each material slot, the element in that category we hold the most of. Short is fine: the blueprint waits
    // and dupes deliver once enough is dug. Nothing of it anywhere means no blueprint.
    static IList<Tag> Materials(BuildingDef def)
    {
        var inv = ClusterManager.Instance.activeWorld.worldInventory; var picked = new List<Tag>();
        for (int i = 0; i < def.MaterialCategory.Length; i++)
        {
            var cats = def.MaterialCategory[i].Split('&').Select(s => new Tag(s)).ToArray();
            var best = ElementLoader.elements.Where(e => cats.Any(c => e.HasTag(c) || e.tag == c))
                .Select(e => new { e.tag, a = inv.GetAmount(e.tag, false) }).OrderByDescending(x => x.a).FirstOrDefault();
            if (best == null || best.a <= 0) return null;
            picked.Add(best.tag);
        }
        return picked;
    }
}

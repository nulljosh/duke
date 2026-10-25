using FezEngine.Structure;
using FezEngine.Tools;
using FezGame;
using FezGame.Services;
using Microsoft.Xna.Framework;
using System.Globalization;
using System.Text;

namespace SurfBridge
{
    // Writes Gomez's state, the level's collectibles and its black holes to surfbridge.json next to the saves,
    // a few times a second, so a script can drive him without screenshots. Read only: it never changes game state.
    public class SurfBridge : GameComponent
    {
        [ServiceDependency] public IPlayerManager PlayerManager { private get; set; }
        [ServiceDependency] public IGameLevelManager LevelManager { private get; set; }
        [ServiceDependency] public IGameCameraManager CameraManager { private get; set; }
        [ServiceDependency] public IGameStateManager GameState { private get; set; }

        static readonly string OutPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Library/Application Support/FEZ/surfbridge.json");
        static readonly HashSet<ActorType> Wanted = new() { ActorType.CubeShard, ActorType.GoldenCube, ActorType.SecretCube, ActorType.PieceOfHeart, ActorType.SkeletonKey };
        int frame;

        public SurfBridge(Game game) : base(game) { Enabled = true; }

        public override void Initialize() { base.Initialize(); ServiceHelper.InjectServices(this); }

        static string F(float v) => v.ToString("0.###", CultureInfo.InvariantCulture);
        static string V(Vector3 v) => $"[{F(v.X)},{F(v.Y)},{F(v.Z)}]";

        public override void Update(GameTime gameTime)
        {
            if (++frame % 6 != 0 || PlayerManager == null || LevelManager?.Name == null) return;
            try
            {
                var sb = new StringBuilder();
                var sd = GameState.SaveData;
                sb.Append($"{{\"t\":{F((float)gameTime.TotalGameTime.TotalSeconds)},\"slot\":{GameState.SaveSlot},\"level\":\"{LevelManager.Name}\",\"loading\":{(GameState.Loading ? "true" : "false")}");
                sb.Append($",\"pos\":{V(PlayerManager.Position)},\"vel\":{V(PlayerManager.Velocity)},\"action\":\"{PlayerManager.Action}\",\"grounded\":{(PlayerManager.Grounded ? "true" : "false")}");
                sb.Append($",\"view\":\"{CameraManager.Viewpoint}\",\"cubes\":{sd.CubeShards},\"anti\":{sd.SecretCubes},\"bits\":{sd.CollectedParts},\"keys\":{sd.Keys}");
                sb.Append(",\"items\":[");
                bool first = true;
                foreach (var t in LevelManager.Triles.Values)
                {
                    var type = t.Trile.ActorSettings.Type;
                    if (!Wanted.Contains(type) || !t.Enabled || t.Removed) continue;
                    sb.Append(first ? "" : ",").Append($"{{\"type\":\"{type}\",\"pos\":{V(t.Position)}}}");
                    first = false;
                }
                sb.Append("],\"movers\":[");   // moving platforms: live bounding box of every trile group that has a path
                first = true;
                foreach (var kv in LevelManager.Groups)
                {
                    var g = kv.Value;
                    if (g.Path == null || g.Triles.Count == 0) continue;
                    var lo = g.Triles[0].Position; var hi = lo;
                    foreach (var t in g.Triles) { lo = Vector3.Min(lo, t.Position); hi = Vector3.Max(hi, t.Position); }
                    sb.Append(first ? "" : ",").Append($"{{\"id\":{kv.Key},\"from\":{V(lo)},\"to\":{V(hi + Vector3.One)}}}");
                    first = false;
                }
                sb.Append("],\"holes\":[");
                first = true;
                foreach (var v in LevelManager.Volumes.Values)
                {
                    if (v.ActorSettings == null || !v.ActorSettings.IsBlackHole) continue;
                    sb.Append(first ? "" : ",").Append($"{{\"on\":{(v.Enabled ? "true" : "false")},\"from\":{V(v.From)},\"to\":{V(v.To)}}}");
                    first = false;
                }
                sb.Append("]}");
                var tmp = OutPath + ".tmp";
                File.WriteAllText(tmp, sb.ToString());
                File.Move(tmp, OutPath, true);
            }
            catch (Exception) { }   // ponytail: a missed frame is fine, the next one rewrites the file
        }
    }
}

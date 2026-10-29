// Skills: who has points to spend, and spending them. The Super Computer needs a dupe with Advanced Research, and the
// rocket techs need the Super Computer.
using System.Linq;
using Klei.AI;
using Newtonsoft.Json.Linq;

public static partial class Ops
{
    static object Skills() => Components.LiveMinionIdentities.Items.Select(m =>
    {
        var r = m.GetComponent<MinionResume>();
        return new { name = m.GetProperName(), points = r.AvailableSkillpoints, mastered = Db.Get().Skills.resources.Where(k => r.HasMasteredSkill(k.Id)).Select(k => k.Id).ToArray(),
            learning = m.gameObject.GetAttributes().Get("Learning").GetTotalValue(), research = m.GetComponent<ChoreConsumer>().GetPersonalPriority(Db.Get().ChoreGroups.Research) };
    }).ToArray();

    // {"name", "skill": "Researching1"}: master it if the dupe has a point and the prerequisites.
    static object Learn(JObject j)
    {
        var m = Components.LiveMinionIdentities.Items.FirstOrDefault(x => x.GetProperName() == (string)j["name"]);
        var skill = Db.Get().Skills.TryGet((string)j["skill"]);
        if (m == null || skill == null) return new { error = "no such dupe or skill" };
        var r = m.GetComponent<MinionResume>();
        if (r.AvailableSkillpoints < 1) return new { error = "no skill points" };
        if (skill.priorSkills.Any(p => !r.HasMasteredSkill(p))) return new { error = "needs " + string.Join(",", skill.priorSkills) };
        r.MasterSkill(skill.Id); return new { ok = true };
    }

    // {"name", "group": "Research", "value": 0-5}: the dupe's own priority for an errand group, as on the Priorities screen.
    static object Priority(JObject j)
    {
        var m = Components.LiveMinionIdentities.Items.FirstOrDefault(x => x.GetProperName() == (string)j["name"]);
        var g = Db.Get().ChoreGroups.TryGet((string)j["group"]);
        if (m == null || g == null) return new { error = "no such dupe or group" };
        m.GetComponent<ChoreConsumer>().SetPersonalPriority(g, (int)j["value"]); return new { ok = true };
    }
}

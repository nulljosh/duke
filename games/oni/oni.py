"""Talk to the Duke Bridge mod inside Oxygen Not Included (127.0.0.1:8741) and capture the game window.
python3 oni.py state | shot | '{"op": ...}'"""
import json, subprocess, sys, time, urllib.request
from pathlib import Path

URL = "http://127.0.0.1:8741"


def state(): return json.load(urllib.request.urlopen(URL + "/state", timeout=20))
def cmd(**op): return json.load(urllib.request.urlopen(urllib.request.Request(URL + "/cmd", json.dumps(op).encode()), timeout=20))


def shot(path="/tmp/oni-shot.png"):
    """The game window by id, even behind his other windows."""
    pid = subprocess.run(["pgrep", "-f", "MacOS/Oxygen Not Included"], capture_output=True, text=True).stdout.split()
    win = Path(__file__).resolve().parent.parent / "fez" / "win"
    for p in pid:
        for line in subprocess.run([str(win), "list", p], capture_output=True, text=True).stdout.splitlines():
            if line.endswith("Oxygen Not Included"): subprocess.run(["screencapture", "-x", "-o", "-l", line.split()[0], path]); return path



def cells(element, x0, y0, x1, y1):
    """Every cell of an element (e.g. "Cuprite") in a box, from the bridge's grid."""
    g = cmd(op="grid", x0=x0, y0=y0, x1=x1, y1=y1)
    code = next((k for k, v in g["legend"].items() if v.split()[0] == element), None)
    return [[x0 + i, y1 - r] for r, row in enumerate(g["rows"]) for i, ch in enumerate(row) if ch == code]


def up():
    try: return state()
    except OSError: return None


def launch():
    """Through Steam (the Steam API refuses a direct launch), then hand the front back to whatever Joshua had up."""
    front = subprocess.run(["lsappinfo", "info", "-only", "bundleID", subprocess.run(["lsappinfo", "front"], capture_output=True, text=True).stdout.strip()], capture_output=True, text=True).stdout.split('"')[-2]
    subprocess.run(["open", "-g", "steam://run/457140"])
    for _ in range(120):
        time.sleep(2)
        if subprocess.run(["pgrep", "-f", "MacOS/Oxygen Not Included"], capture_output=True).returncode == 0: break
    time.sleep(3); subprocess.run(["open", "-b", front])
    for _ in range(120):
        if up(): return
        time.sleep(3)
    sys.exit("the bridge never answered")


def newgame():
    """Main menu to a running colony: Survival, Standard asteroids, the default destination, the rolled dupes."""
    for t, m, wait in [("MainMenu", "NewGame", 3), ("ModeSelectScreen", "OnClickSurvival", 3), ("ClusterCategorySelectionScreen", "<OnSpawn>b__8_0", 4),
                       ("ColonyDestinationSelectScreen", "LaunchClicked", 0)]:
        print(t, cmd(op="invoke", type=t, method=m)); time.sleep(wait)
    while "MinionSelectScreen" not in state()["screens"]: time.sleep(3)
    time.sleep(6); print(cmd(op="invoke", type="MinionSelectScreen", method="OnProceed"))
    while not state().get("dupes"): time.sleep(3)
    time.sleep(3); print(cmd(op="invoke", type="StoryMessageScreen", method="<OnActivate>b__22_0")); cmd(op="pause")


if __name__ == "__main__":
    a = sys.argv[1]
    if a in ("launch", "newgame"): globals()[a]()
    else: print(json.dumps(state() if a == "state" else shot() if a == "shot" else cmd(**json.loads(a)))[:4000])

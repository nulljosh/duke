"""Sets up an isolated Dolphin profile on the LaCie and launches Pikmin 2 hidden, without taking focus.
Profile: background input on (so the DSU pad works unfocused), no audio, no pause on focus loss, the DSU pad
from dsu.py as GameCube port 1, and MemoryWatcher reading the addresses in mem.py.
python3 dolphin.py setup | launch | stop"""
import subprocess
import sys
import time
from pathlib import Path

USER = Path("/Volumes/LaCie/dolphin-duke")
ISO = Path("/Volumes/LaCie/roms/pikmin2/Pikmin 2 (Europe) (En,Fr,De,Es,It).rvz")
APP = "/Applications/Dolphin.app"

PAD = {
    "Device": "DSUClient/0/Duke",
    "Buttons/A": "Cross", "Buttons/B": "Circle", "Buttons/X": "Square", "Buttons/Y": "Triangle",
    "Buttons/Z": "R1", "Buttons/Start": "Options",
    "Main Stick/Up": "`Left Y+`", "Main Stick/Down": "`Left Y-`",
    "Main Stick/Left": "`Left X-`", "Main Stick/Right": "`Left X+`",
    "C-Stick/Up": "`Right Y+`", "C-Stick/Down": "`Right Y-`",
    "C-Stick/Left": "`Right X-`", "C-Stick/Right": "`Right X+`",
    "Triggers/L": "L2", "Triggers/R": "R2", "Triggers/L-Analog": "L2", "Triggers/R-Analog": "R2",
    "D-Pad/Up": "`Pad N`", "D-Pad/Down": "`Pad S`", "D-Pad/Left": "`Pad W`", "D-Pad/Right": "`Pad E`",
}


def ini(path, sections):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(f"[{s}]\n" + "".join(f"{k} = {v}\n" for k, v in kv.items()) for s, kv in sections.items()))


def setup(locations=()):
    cfg = USER / "Config"
    ini(cfg / "Dolphin.ini", {
        "General": {"HotkeysRequireFocus": "False", "GDBSocket": str(USER / "gdb.sock")},   # gdbd.py
        "Core": {"SIDevice0": 6, "SIDevice1": 0, "SIDevice2": 0, "SIDevice3": 0},
        "DSP": {"Backend": "No Audio Output", "Volume": 0},
        "Interface": {"ConfirmStop": "False", "PauseOnFocusLost": "False", "UsePanicHandlers": "False",
                      "ShowActiveTitle": "False"},
        "Input": {"BackgroundInput": "True"},
        "Display": {"RenderToMain": "False", "Fullscreen": "False", "RenderWindowWidth": 640, "RenderWindowHeight": 480},
        "Analytics": {"PermissionAsked": "True", "Enabled": "False"},
        "AutoUpdate": {"UpdateTrack": ""},
    })
    ini(cfg / "DSUClient.ini", {"Server": {"Enabled": "True", "Entries": "Duke:127.0.0.1:26760;"}})
    ini(cfg / "GCPadNew.ini", {"GCPad1": PAD})
    ini(cfg / "Hotkeys.ini", {"Hotkeys": {"Device": "DSUClient/0/Duke", "General/Take Screenshot": "Share"}})
    mw = USER / "MemoryWatcher"
    mw.mkdir(parents=True, exist_ok=True)
    (mw / "Locations.txt").write_text("".join(l + "\n" for l in locations))
    return USER


def launch():
    # open -g keeps focus where it is; -n gives a fresh instance with our profile.
    subprocess.run(["open", "-g", "-n", "-a", APP, "--args", "-u", str(USER), "-b", "-e", str(ISO)], check=True)
    time.sleep(5)
    hide()


def hide():
    # Hidden, the game keeps running and pk2.shot() still works through Dolphin's own screenshot hotkey.
    subprocess.run(["osascript", "-e", 'tell application "System Events" to set visible of every process '
                    'whose name is "Dolphin" to false'])


def stop():
    subprocess.run(["pkill", "-f", f"Dolphin.app/Contents/MacOS/Dolphin -u {USER}"])


if __name__ == "__main__":
    {"setup": lambda: print(setup()), "launch": launch, "stop": stop, "hide": hide}[sys.argv[1]]()

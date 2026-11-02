"""Where a day's seconds go: every time.sleep, totalled by the line that slept, printed at exit (day 13: 22 to 50 s per entrant)."""
import atexit, collections, sys, time
from pathlib import Path

SLEPT, _sleep = collections.Counter(), time.sleep
def _counted(s): f = sys._getframe(1); SLEPT[f"{f.f_code.co_name}:{f.f_lineno}"] += s; _sleep(s)
time.sleep = _counted
atexit.register(lambda: print("slept", [(k, round(v)) for k, v in SLEPT.most_common(15)], flush=True))


class _Tee:   # and every line also goes to runs/live.log as it happens: day.py only writes its log at the day's end
    def __init__(self, *fs): self.fs = fs
    def write(self, s): [f.write(s) for f in self.fs]; [f.flush() for f in self.fs]; return len(s)
    def flush(self): [f.flush() for f in self.fs]


(Path(__file__).resolve().parent / "runs").mkdir(exist_ok=True)
sys.stdout = _Tee(sys.stdout, open(Path(__file__).resolve().parent / "runs" / "live.log", "a"))

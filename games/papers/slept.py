"""Where a day's seconds go: every time.sleep, totalled by the line that slept, printed at exit (day 13: 22 to 50 s per entrant)."""
import atexit, collections, sys, time

SLEPT, _sleep = collections.Counter(), time.sleep
def _counted(s): f = sys._getframe(1); SLEPT[f"{f.f_code.co_name}:{f.f_lineno}"] += s; _sleep(s)
time.sleep = _counted
atexit.register(lambda: print("slept", [(k, round(v)) for k, v in SLEPT.most_common(15)], flush=True))

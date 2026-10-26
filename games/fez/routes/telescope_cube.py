"""TELESCOPE: the code anti-cube on top of the telescope tube (17.5, 35.5, 19.5) (found by hand 2026-10-26, cube 32).
Every step up is a one-way platform at a half height, so the planner sees none of it; all in the Front view:
door floor > right stone pillar > left stone pillar > library roof > pedestal > brass collar > seat (catch its corner)
> tube top, then a jump into the cube. Hops are timed from where each one worked."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fez, go


def climb_up(s):
    if s["action"].startswith("Grab"):
        fez.edge("up", True); time.sleep(0.3); fez.edge("up", False); time.sleep(1)
    return fez.state()


def cube():
    go.turn_to("Front"); fez.walk(22.5, tol=0.2)
    climb_up(fez.runjump(24.2, 28.0, jump_ms=450))          # right stone pillar
    fez.walk(28.1, tol=0.15)
    climb_up(fez.hop(26.2, jump_ms=500, lead=0.3))          # left stone pillar
    climb_up(fez.hop(22.8, jump_ms=500, lead=0.3))          # library roof
    fez.walk(21.0, tol=0.2)
    climb_up(fez.hop(19.0, jump_ms=350, lead=0.3))          # pedestal
    fez.walk(20.2, tol=0.15)
    climb_up(fez.hop(17.6, jump_ms=450, lead=0.3))          # brass collar
    fez.walk(18.6, tol=0.15)
    climb_up(fez.runjump(16.7, 14.2, jump_ms=700))          # seat
    climb_up(fez.hop(17.4, jump_ms=600, lead=0.3))          # tube top
    fez.walk(17.5, tol=0.1)
    fez.edge("space", True); time.sleep(0.3); fez.edge("space", False); time.sleep(4)
    return fez.state()


if __name__ == "__main__":
    s = cube(); print(s and (s["level"], s["pos"], s["cubes"], s["anti"]))

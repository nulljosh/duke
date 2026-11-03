"""Run a plan step by step with an undo: savestate before the first step, and after every step that loses nothing;
a step that fails or costs a Pikmin is rolled back with loadstate and the plan stops there.
  python3 steps.py 'python3 -u fight.py 1 -108 2918' 'python3 -u fetch.py -627 3338' ..."""
import os
import subprocess
import sys
import time
import pk2


def checkpoint(load=False):
    pad = pk2.Pad()                            # take the lock only between steps; each step drives on its own
    (pk2.loadstate if load else pk2.savestate)(pad)
    pad.lock.close()
    # the day clock travels with the savestate: a rollback rewinds the sun, so rewind .daystart too (2026-11-03: four
    # rollbacks left it reading "late" before noon and the bot sat out the morning)
    ds, ck = pk2.HERE + "/.daystart", pk2.HERE + "/.ckpt_elapsed"
    if load and os.path.exists(ck):
        open(ds, "w").write(str(time.time() - float(open(ck).read())))
    elif not load and os.path.exists(ds):
        open(ck, "w").write(str(time.time() - float(open(ds).read())))


FREEZE = 75                                     # seconds with nothing changing before a step is called stuck
TOL = int(os.environ.get("PK_TOLERATE", "0"))   # Pikmin a step may lose before it is rolled back: zero-loss
# rollbacks kept floor 1 of Hole of Beasts at a standstill for 30 min over single Sheargrub bites (2026-11-03)
checkpoint()
base = pk2.alive()
print("checkpoint, alive", base, flush=True)
import os
import time
DAY = 13 * 60          # ponytail: a Pikmin 2 day is ~13 min at 1x; wall clock since start.py, not the sun gauge in RAM
for cmd in sys.argv[1:]:
    t0 = float(open(pk2.HERE + "/.daystart").read()) if os.path.exists(pk2.HERE + "/.daystart") else time.time()
    incave = pk2.u32(pk2.u32(pk2.u32(0x80516688) + 0x08)) == 0x804B2E90   # caves stop the clock (EditorRouteMgr)
    if time.time() - t0 > DAY - 4 * 60 and "dayend" not in cmd and not incave:
        print("LATE: under 4 min of day left, no new step; run dayend.py", flush=True)
        sys.exit(5)
    print("STEP", cmd, flush=True)
    area = pk2.u32(0x80516688)                 # the map manager: a new one means a cave or floor change, where the
    moved_area = False                         # Pikmin left outside drop out of alive() without dying
    proc = subprocess.Popen(cmd, shell=True, start_new_session=True)
    frozen = False
    sig, still = None, time.time()             # freeze guard: nothing moved for FREEZE s (captain, squad, enemy hp)
    while proc.poll() is None and not moved_area:                 # live guard: a death mid-step stops it at once, not when it ends
        time.sleep(1)                          # (2026-11-03: a day-end wait drifted into water; 8 drowned before it ended)
        try:
            # progress signature on a coarse 150-unit grid: walking in circles in one spot reads as stuck too
            # (2026-11-03: the bot circled a wall while aiming); treasure positions count as progress
            loot = round(sum(p["x"] + p["z"] for p in pk2.pellets("treasure")) / 50)
            now_sig = (round(pk2.pos()[0] / 150), round(pk2.pos()[1] / 150), pk2.squad(0),
                       round(sum(e["hp"] for e in pk2.enemies())), loot)
            if now_sig != sig:
                sig, still = now_sig, time.time()
            elif time.time() - still > FREEZE and "dayend" not in cmd:
                os.killpg(proc.pid, 9)
                print("FROZEN", FREEZE, "s, killed it", pk2.shot("frozen"), flush=True)
                frozen = True
                break
            if pk2.u32(0x80516688) != area:
                moved_area = True
            elif 0 < pk2.alive() < base - TOL:  # 0 = loading or results screen, never a real wipe in 1 s
                time.sleep(1.5)                # (2026-11-03: the hole's floor change read 0 and was rolled back)
                if pk2.u32(0x80516688) != area or pk2.alive() == 0 or pk2.alive() >= base - TOL:
                    continue
                os.killpg(proc.pid, 9)
                print("DEATH mid-step, killed it", pk2.shot("death"), [round(v) for v in pk2.pos()], flush=True)
                break
        except Exception:                      # captains unloaded mid area change: just keep waiting
            pass
    rc = proc.wait()
    for _ in range(30):                        # a floor change reads 0 Pikmin until the new floor loads
        now = pk2.alive()
        if now:
            break
        time.sleep(1)
    if moved_area or pk2.u32(0x80516688) != area:
        base = now                             # new area, new count
    lost = 0 < now < base - TOL
    if (moved_area or pk2.u32(0x80516688) != area) and not lost:
        rc = 0                                 # reached a new floor or area: that is the goal, whatever came after
    if (frozen or rc == 4) and not lost:       # stuck or unfinished but nobody hurt: keep the progress, retry
        checkpoint()
        print("checkpoint after freeze, alive", now, flush=True)
        sys.exit(6)
    if rc not in (0, 3) or lost:
        print("ROLLBACK rc", rc, "alive", now, "of", base, flush=True)
        checkpoint(load=True)
        print("after load alive", pk2.alive(), flush=True)
        sys.exit(1)
    base = now
    checkpoint()
    print("checkpoint, alive", base, flush=True)
print("PLAN DONE", flush=True)

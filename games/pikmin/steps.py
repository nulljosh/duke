"""Run a plan step by step with an undo: savestate before the first step, and after every step that loses nothing;
a step that fails or costs a Pikmin is rolled back with loadstate and the plan stops there.
  python3 steps.py 'python3 -u fight.py 1 -108 2918' 'python3 -u fetch.py -627 3338' ..."""
import subprocess
import sys
import pk2


def checkpoint(load=False):
    pad = pk2.Pad()                            # take the lock only between steps; each step drives on its own
    (pk2.loadstate if load else pk2.savestate)(pad)
    pad.lock.close()


checkpoint()
base = pk2.alive()
print("checkpoint, alive", base, flush=True)
for cmd in sys.argv[1:]:
    print("STEP", cmd, flush=True)
    rc = subprocess.call(cmd, shell=True)
    now = pk2.alive()
    if rc != 0 or now < base:
        print("ROLLBACK rc", rc, "alive", now, "of", base, flush=True)
        checkpoint(load=True)
        print("after load alive", pk2.alive(), flush=True)
        sys.exit(1)
    base = now
    checkpoint()
    print("checkpoint, alive", base, flush=True)
print("PLAN DONE", flush=True)

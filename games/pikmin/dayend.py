"""Wait for sunset with everyone in the squad, then press A through the results until the memory card is written."""
import os, time
import pk2

GCI = "/Volumes/LaCie/dolphin-duke/GC/EUR/Card A/01-GPVP-Pikmin2_SaveData.gci"
pad = pk2.Pad()
pk2.gather(pad)
print("squad", pk2.squad(0), "alive", pk2.alive(), flush=True)
while not pk2.frozen(pad):                      # sunset takes the stick away
    time.sleep(5)
print("sunset", pk2.shot("sunset4"), flush=True)
t0 = os.path.getmtime(GCI)
for i in range(200):
    if os.path.getmtime(GCI) > t0:
        print("saved", i, flush=True); break
    pad.press("A", after=1.5)
    if i % 20 == 0:
        print("press", i, pk2.shot(f"end{i}"), flush=True)
time.sleep(5)
print(pk2.shot("day5"), flush=True)

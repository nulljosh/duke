"""Title screen to File 1 in the field. The Ship's Log screen remembers the last cursor (it sat on File 3 once and a
new game started), so push left three times first. Then A through the day intro until the stick is free.
  python3 load.py          from the title
  python3 load.py --menu   already on the Ship's Log screen"""
import sys
import time
import pk2

pad = pk2.Pad()
if "--menu" not in sys.argv:
    time.sleep(3)
    pad.press("START", after=5)
    pad.press("A", after=7)                    # BEGIN: the Ship's Log screen
for _ in range(3):
    pad.cmd("stick -1 0"); time.sleep(0.25); pad.cmd("release all"); time.sleep(1.2)
print(pk2.shot("log-file1"), flush=True)
pad.press("A", after=4)
for i in range(30):
    try:
        if pk2.navi(0)[0] and not pk2.frozen(pad):
            break
    except ValueError:                         # captains not loaded yet
        pass
    pad.press("A", after=4)
time.sleep(1)
print("in field", i, pk2.shot("loaded"), flush=True)

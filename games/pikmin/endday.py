"""Day end: whistle both captains' Pikmin into squads so none are eaten at sunset, then wait for the day to end."""
import time

import pk2

pad = pk2.Pad()
pk2.ACTIVE = 1
pk2.whistle_at(pad, -1080, 3320, ms=3000)       # Louie's six by the reactor
print("louie squad", pk2.squad(1), flush=True)
pad.press("Y", 100, after=2.5)                  # swap to Olimar
pk2.ACTIVE = 0
pk2.whistle_at(pad, -700, 2800, ms=3000)        # the eight left at the carcass spot
print("olimar squad", pk2.squad(0), flush=True)
while not pk2.frozen(pad):                      # sunset takes the stick away
    time.sleep(5)
print("sunset", pk2.shot("sunset"), flush=True)

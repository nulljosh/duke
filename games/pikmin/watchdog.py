"""Prints STUCK when neither captain has moved for 30 seconds, so the loop wakes on a stall instead of on Joshua.
Read-only: it never touches the pad. python3 watchdog.py | (a Monitor)"""
import time

import pk2

last, still = None, 0
while True:
    try:
        now = [tuple(round(v) for v in pk2.navi(i)[:2]) for i in (0, 1)]
    except Exception as e:
        print("ERR", e, flush=True)
        time.sleep(10)
        continue
    still = still + 5 if now == last else 0
    if still == 30:
        print("STUCK", now, "squads", pk2.squad(0), pk2.squad(1), flush=True)
    last = now
    time.sleep(5)

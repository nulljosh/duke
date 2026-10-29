"""Holds Dolphin's MemoryWatcher socket for the whole run and keeps the latest value of every watched address in
mem.json, because the watcher only sends a value when it changes. Start it before Dolphin boots."""
import json
import os
import time

import pk2

OUT = os.path.join(pk2.HERE, "mem.json")

if __name__ == "__main__":
    m = pk2.Memory()
    while True:
        v = m.poll()
        tmp = OUT + ".tmp"
        with open(tmp, "w") as f:
            json.dump({"t": time.time(), **v}, f)
        os.replace(tmp, OUT)
        time.sleep(0.5)

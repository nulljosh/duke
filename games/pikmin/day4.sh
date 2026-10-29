#!/bin/sh
# Day 4: Onion out, break the white gate, stop at Emergence Cave's hole with the prompt up.
cd "$(dirname "$0")"
python3 -u onion.py && python3 -u gate2.py && python3 -u cave.py

#!/bin/sh
# Day 3: Onion out, farm to 36, crush the 35-Pikmin bag.
cd "$(dirname "$0")"
python3 -u onion.py && python3 -u farm2.py 36 && python3 -u bag2.py

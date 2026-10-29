#!/bin/sh
cd "$(dirname "$0")"
python3 -u gate2.py && python3 -u cave.py

#!/bin/bash
# Reload the last save from scratch: stop the stream and Dolphin, relaunch Dolphin (gdbd first, it blocks at boot),
# unhide it for the capture, restart the stream on the fresh audio dump, then load File 1 into the field.
# Undoes everything since the last day-end save; that is the point when a run goes wrong (lost Pikmin, a bad turn).
cd "$(dirname "$0")"
pkill -f "bash stream.sh"; pkill wincap; pkill -f "ffmpeg.*flv"; pkill -f "tail -c"
pkill -9 -f "fetch.py|day5"; python3 dolphin.py stop; sleep 2
pkill -f gdbd.py; nohup python3 -u gdbd.py > /tmp/pk-gdbd.out 2>&1 &
pgrep -f dsu.py >/dev/null || nohup python3 -u dsu.py > /tmp/pk-dsu.out 2>&1 &
pgrep -f memd.py >/dev/null || nohup python3 -u memd.py > /tmp/pk-memd.out 2>&1 &
sleep 2
python3 dolphin.py launch
osascript -e 'tell application "System Events" to set visible of every process whose name is "Dolphin" to true'
sleep 8
nohup bash stream.sh >/dev/null 2>&1 &
python3 -u load.py

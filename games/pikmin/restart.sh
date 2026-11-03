#!/bin/bash
# Reload the last save from scratch: stop the stream and Dolphin, relaunch Dolphin (gdbd first, it blocks at boot),
# unhide it for the capture, restart the stream on the fresh audio dump, then load File 1 into the field.
# restart.sh --state comes back to the slot-1 savestate instead (no progress lost, daemons restarted detached).
# Plain restart.sh undoes everything since the last day-end save; that is the point when a run goes wrong (lost Pikmin, a bad turn).
cd "$(dirname "$0")"
# Daemons start in their own session so they outlive this shell and don't sit in Claude's task list for hours.
bg() { python3 -c 'import subprocess, sys; subprocess.Popen(sys.argv[2:], stdout=open(sys.argv[1], "w"),
  stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, start_new_session=True)' "$@"; }
pkill -f "bash stream.sh"; pkill wincap; pkill -f "ffmpeg.*flv"; pkill -f "tail -c"
pkill -9 -f "steps.py|fetch.py|fight.py|start.py|probe.py|load.py"; python3 dolphin.py stop; sleep 2
pkill -f gdbd.py; bg /tmp/pk-gdbd.out python3 -u gdbd.py
pkill -f dsu.py; bg /tmp/pk-dsu.out python3 -u dsu.py
pkill -f memd.py; bg /tmp/pk-memd.out python3 -u memd.py
sleep 2
python3 dolphin.py launch
osascript -e 'tell application "System Events" to set visible of every process whose name is "Dolphin" to true'
sleep 8
bg /dev/null bash stream.sh
if [ "$1" = "--state" ]; then                 # back to the savestate in slot 1 instead of the card save
  sleep 12; python3 -c 'import pk2; pad = pk2.Pad(); pk2.loadstate(pad); print("state loaded, alive", pk2.alive())'
else
  python3 -u load.py
fi

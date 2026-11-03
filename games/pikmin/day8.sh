#!/bin/bash
# Day 8: morning (purples + Reds), walk to the Burrow-nit standoff, Louie punches it, then Hole of Beasts floors 1-2.
# Every step runs under steps.py: savestate checkpoints, live death guard, rollback.
cd "$(dirname "$0")"
python3 -u -c "import pk2; pk2.control(pk2.Pad())"
python3 -u steps.py 'python3 -u start.py' || exit 1
python3 -u steps.py 'python3 -u go.py -503 1639 40' || true          # stops short of the Burrow-nit (threat guard)
python3 -u steps.py 'python3 -u punch.py 15 -672 1392' || exit 1
python3 -u steps.py 'python3 -u go.py -1467 732 120' 'python3 -u enter.py -1467 732' || exit 1
for f in 1 2; do python3 -u steps.py 'python3 -u floor.py down' || exit 1; done
echo DAY8 PLAN DONE

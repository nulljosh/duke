#!/bin/bash
# One Awakening Wood day, start to Hole of Beasts sublevel 5 (stops before the Empress). Every step under steps.py:
# checkpoints, death guard, freeze/circling guard, 1 loss tolerated. Never run two drivers at once.
cd "$(dirname "$0")"
export PK_TOLERATE=1
python3 -u -c "import pk2; pk2.control(pk2.Pad())"
python3 -u steps.py 'python3 -u start.py' || exit 1
python3 -u steps.py 'python3 -u go.py -503 1639 40' || true
python3 -u steps.py 'python3 -u punch.py 15 -672 1392' || true
for t in 1 2 3; do python3 -u steps.py 'python3 -u go.py -1467 732 120' 'python3 -u enter.py -1467 732' && break; done
./cave.sh 4
echo DAY PLAN DONE

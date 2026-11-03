#!/bin/bash
# Day 7 resume: Hole of Beasts (Burrow-nit fought with --stay, rolled back on any loss), then floors 1-2.
cd "$(dirname "$0")"
for t in 1 2 3 4; do
  python3 -u steps.py 'python3 -u go.py -1467 732 120' 'python3 -u enter.py -1467 732' && break
  [ $t = 4 ] && exit 1
done
for f in 1 2; do python3 -u steps.py 'python3 -u floor.py down' || exit 1; done
echo DAY7 PLAN DONE

#!/bin/bash
cd "$(dirname "$0")"
python3 -u steps.py 'python3 -u go.py -1467 732 120' 'python3 -u enter.py -1467 732' || exit 1
for f in 1 2; do python3 -u steps.py 'python3 -u floor.py down' || exit 1; done
echo PLAN DONE

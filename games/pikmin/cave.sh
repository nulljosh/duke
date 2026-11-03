#!/bin/bash
# Clear N cave floors with floor.py under steps.py (checkpoints, death and freeze guards, 1 loss tolerated per step).
# Never idle: a frozen or failed floor is retried at once, up to 6 times.
cd "$(dirname "$0")"
export PK_TOLERATE=${PK_TOLERATE:-1}
for f in $(seq ${1:-2}); do
  for t in 1 2 3 4 5 6; do python3 -u steps.py 'python3 -u floor.py down' && break; [ $t = 6 ] && { echo "FLOOR STUCK"; exit 1; }; done
  echo "FLOOR $f DONE"
done

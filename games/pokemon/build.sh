#!/bin/sh
# Builds the headless player against Homebrew's libmgba (brew install mgba).
cd "$(dirname "$0")" && cc -O2 -Wall -o gba gba.c -I/opt/homebrew/opt/mgba/include -L/opt/homebrew/opt/mgba/lib -lmgba -Wl,-rpath,/opt/homebrew/opt/mgba/lib

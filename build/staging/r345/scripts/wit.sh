#!/bin/bash
# usage: wit.sh <tag> <url>   — the 74's waist witness cameras
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
cd /Users/augustgweon/Ships/build/staging/r345
WURL="$2" "$PY" scripts/r345_witness.py wit "$1" \
  '#v=ship&s=ship-of-the-line&sail=furled&b=90&l=50&z=0.5' sol-waist-top \
  '#v=ship&s=ship-of-the-line&sail=furled&b=140&l=45&z=0.45' sol-waist-aft

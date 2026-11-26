#!/bin/bash
# usage: wit.sh <tag> <url>   — the 74 and Preussen witness cameras
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
cd /Users/augustgweon/Ships/build/staging/r343
WURL="$2" "$PY" ../r339/scripts/r339_witness.py wit "$1" \
  '#v=ship&s=ship-of-the-line&sail=furled&b=90&l=22&z=1.05' sol-fbeam \
  '#v=ship&s=ship-of-the-line&sail=furled&b=140&l=18&z=0.9' sol-fquarter \
  '#v=ship&s=ship-of-the-line&b=50&l=10&z=1.0' sol-bow \
  '#v=ship&s=preussen&b=120&l=12&z=0.8' pr-quarter

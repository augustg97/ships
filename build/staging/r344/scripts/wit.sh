#!/bin/bash
# usage: wit.sh <tag> <url>   — the 74's barricade witness cameras
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
cd /Users/augustgweon/Ships/build/staging/r344
WURL="$2" "$PY" ../r339/scripts/r339_witness.py wit "$1" \
  '#v=ship&s=ship-of-the-line&sail=furled&b=140&l=18&z=0.9' sol-fquarter \
  '#v=ship&s=ship-of-the-line&sail=furled&b=120&l=8&z=0.55' sol-qclose \
  '#v=ship&s=ship-of-the-line&sail=furled&b=60&l=10&z=0.6' sol-fclose

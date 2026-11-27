#!/bin/bash
# usage: wit.sh <tag> <url>
cd /Users/augustgweon/Ships
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
WURL="$2" "$PY" build/staging/r345/scripts/r345_witness.py build/staging/r362/wit "$1" \
  "#v=ship&s=ship-of-the-line&sail=furled&b=250&l=30&z=0.3" stbd \
  "#v=ship&s=ship-of-the-line&sail=furled&b=110&l=25&z=0.4" high \
  "#v=ship&s=ship-of-the-line&sail=furled&b=200&l=40&z=0.25" qd

#!/bin/bash
# usage: wit.sh <tag> <url>
cd /Users/augustgweon/Ships
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
WURL="$2" "$PY" build/staging/r345/scripts/r345_witness.py build/staging/r360/wit "$1" \
  "#v=ship&s=ship-of-the-line&sail=furled&b=90&l=4&z=0.45" beam \
  "#v=ship&s=ship-of-the-line&sail=furled&b=135&l=8&z=0.45" pq \
  "#v=ship&s=ship-of-the-line&sail=furled&b=110&l=25&z=0.4" high \
  "#v=ship&s=ship-of-the-line&sail=furled&b=60&l=6&z=0.3" qd \
  "#v=ship&s=ship-of-the-line&sail=furled&b=250&l=30&z=0.3" stbd

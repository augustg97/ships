#!/bin/bash
# usage: wit.sh <tag> <url>
cd /Users/augustgweon/Ships
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
WURL="$2" "$PY" build/staging/r345/scripts/r345_witness.py build/staging/r357/wit "$1" \
  "#v=ship&s=ship-of-the-line&sail=furled&b=135&l=8&z=0.45" pq \
  "#v=ship&s=ship-of-the-line&sail=furled&b=90&l=4&z=0.45" beam \
  "#v=ship&s=ship-of-the-line&sail=furled&b=180&l=8&z=0.45" astern \
  "#v=ship&s=ship-of-the-line&sail=furled&b=110&l=25&z=0.4" high

#!/bin/bash
# usage: wit.sh <tag> <url>   — each changed hull's deck from above the port beam
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
cd /Users/augustgweon/Ships/build/staging/r346
A=()
for s in ${HULLS:-caravel}; do
  A+=("#v=ship&s=$s&sail=furled&b=90&l=65&z=0.6" "$s-top")
done
WURL="$2" "$PY" scripts/r346_witness.py wit "$1" "${A[@]}"

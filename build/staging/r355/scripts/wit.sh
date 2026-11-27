#!/bin/bash
# usage: wit.sh <tag> <url>
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
cd /Users/augustgweon/Ships/build/staging/r355
WURL="$2" "$PY" scripts/r355_witness.py wit "$1" \
  '#v=ship&s=ship-of-the-line&sail=furled&b=90&l=4&z=0.45' sotl-stern-beam \
  '#v=ship&s=ship-of-the-line&sail=furled&b=150&l=10&z=0.45' sotl-stern-pq \
  '#v=ship&s=ship-of-the-line&sail=furled&b=180&l=8&z=0.45' sotl-stern-astern \
  '#v=ship&s=east-indiaman&sail=furled&b=150&l=10&z=0.45' ei-stern-pq

#!/bin/bash
# usage: wit.sh <tag> <url>
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
cd /Users/augustgweon/Ships/build/staging/r354
WURL="$2" "$PY" scripts/r354_witness.py wit "$1" \
  '#v=ship&s=ship-of-the-line&sail=furled&b=140&l=35&z=0.5' sotl-aftq \
  '#v=ship&s=ship-of-the-line&sail=furled&b=40&l=35&z=0.5' sotl-fwdq \
  '#v=ship&s=carrack&sail=furled&b=140&l=35&z=0.5' carrack-aftq

#!/bin/bash
# usage: wit.sh <tag> ; captures the round's witness set from $WURL
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
cd /Users/augustgweon/Ships/build/staging/r341
W="#v=ship&s=ship-of-the-line&b=90&l=4&z=0.75 sol-beam #v=ship&s=ship-of-the-line&b=55&l=6&z=0.5 sol-pq #v=ship&s=endurance&b=90&l=4&z=0.7 end-beam #v=ship&s=east-indiaman&b=90&l=4&z=0.75 ei-beam"
[ -n "$SKIP1" ] && W="${W#* * }"
"$PY" ../r339/scripts/r339_witness.py wit "$1" $W

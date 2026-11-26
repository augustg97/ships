#!/bin/bash
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
cd /Users/augustgweon/Ships/build/staging/r342
"$PY" ../r339/scripts/r339_witness.py wit "$1" "${@:2}"

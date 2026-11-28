#!/bin/bash
# usage: acc.sh <frame> <pct> <reason>
cd /Users/augustgweon/Ships
mkdir -p Research/baselines/_current
cp "build/staging/r369/run1/$1.png" "Research/baselines/_current/$1.png"
"/Users/augustgweon/Modeling Studio/.venv/bin/python" "/Users/augustgweon/Modeling Studio/tools/frame_baseline.py" accept --project ~/Ships --frame "$1" \
  --reason "r369, predicted: $3; node scripts/r369_same.js: only the ten oak-stocked hulls' vertices differ from HEAD; $2, captured one process each (run-each.sh) and scored with r277's offline scorer; build/staging/r369/wit/mv-$1.png"

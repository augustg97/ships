#!/bin/bash
cd ~/Ships
P="/Users/augustgweon/Modeling Studio/.venv/bin/python"
T="/Users/augustgweon/Modeling Studio/tools/frame_baseline.py"
for f in shipwright-astern ship-galley; do
  "$P" "$T" check --project ~/Ships --frame "$f"
  echo "EXIT $f: $?"
done
echo DONE

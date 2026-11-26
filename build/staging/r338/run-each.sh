#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r338
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
for f in $(cat resume.txt); do
  echo "$(date +%T) $f"
  ONLY=$f "$PY" ../r330/r330_capture.py run2 > cap-$f.log 2>&1 || echo "  FAILED $f"
done
echo "EACH-DONE $(date +%T)"

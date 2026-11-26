#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r344
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
for f in $(cat $1); do
  echo "$(date +%T) $f"
  ONLY=$f "$PY" ../r330/r330_capture.py ${OUT:-run3} > cap-$f.log 2>&1 || echo "  FAILED $f"
done
echo "EACH-DONE $(date +%T)"

#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r325
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
for f in $(cat resume.txt); do
  echo "$(date +%T) $f"
  ONLY=$f "$PY" r325_capture.py run2 > cap-$f.log 2>&1 || echo "  FAILED $f"
done
echo RESUME-DONE

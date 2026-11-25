#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r328
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
for f in $(cat resume.txt); do
  echo "$(date +%T) $f"
  ONLY=$f "$PY" r328_capture.py run3 > cap-$f.log 2>&1 || echo "  FAILED $f"
done
echo RESUME-DONE

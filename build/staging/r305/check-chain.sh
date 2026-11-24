#!/bin/bash
cd /Users/augustgweon/Ships
R=build/staging/r305
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
for f in action-myeongnyang wake-plan ship-ever-given sea-ever-given passage-sahul sea-dugout-floor sea-canoe-floor ship-slave-ship ship-carrack; do
  "$PY" "/Users/augustgweon/Modeling Studio/tools/frame_baseline.py" check --project /Users/augustgweon/Ships --frame $f > $R/check-$f.out 2>&1
  echo "$f $?" >> $R/chain.log
  mkdir -p $R/chain-current; cp Research/baselines/_current/*.png $R/chain-current/ 2>/dev/null; cp Research/baselines/_diff/*.png $R/chain-current/ 2>/dev/null
done
echo DONE >> $R/chain.log

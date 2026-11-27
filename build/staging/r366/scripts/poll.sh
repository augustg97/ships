#!/bin/bash
# score every newly captured run1 frame once; append to score1.out
cd /Users/augustgweon/Ships/build/staging/r366
mkdir -p scored1
for p in run1/*.png; do n=$(basename $p); [ -f scored1/$n ] && continue
  # a PNG is complete once the next frame's log has started or EACH-DONE is printed
  f=${n%.png}; nxt=$(grep -A1 "^$f\$" all.txt | tail -1)
  if [ "$nxt" != "$f" ] && ! grep -q " $nxt\$" each1.out && ! grep -q EACH-DONE each1.out; then continue; fi
  rm -rf one; mkdir one; cp $p one/; cp $p scored1/
  "/Users/augustgweon/Modeling Studio/.venv/bin/python" ../r277/score-offline.py one diffone 2>&1 | grep -E "^\s+$f " >> score1.out
done

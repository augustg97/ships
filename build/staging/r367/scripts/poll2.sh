#!/bin/bash
# score every newly captured run2 frame once; append to score2.out
cd /Users/augustgweon/Ships/build/staging/r367
mkdir -p scored2
for p in run2/*.png; do n=$(basename $p); [ -f scored2/$n ] && continue
  # a PNG is complete once the next frame's log has started or EACH-DONE is printed
  f=${n%.png}; nxt=$(grep -A1 "^$f\$" rest.txt | tail -1)
  if [ "$nxt" != "$f" ] && ! grep -q " $nxt\$" each2.out && ! grep -q EACH-DONE each2.out; then continue; fi
  rm -rf one; mkdir one; cp $p one/; cp $p scored2/
  "/Users/augustgweon/Modeling Studio/.venv/bin/python" ../r277/score-offline.py one diffone 2>&1 | grep -E "^\s+$f " >> score2.out
done

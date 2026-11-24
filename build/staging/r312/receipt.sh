#!/bin/zsh
# r312 receipt: score every run dir, recapture named faults alone, append the receipt, commit, push.
cd /Users/augustgweon/Ships/build/staging/r312
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
for r in run*-current; do "$PY" ../r277/score-offline.py $r score-diff > score-$r.out 2>&1; done
grep -h -v " ok$" score-run*-current.out | grep -v "frames scored"
echo "scored: $(cat score-run*-current.out | grep -c '%')"

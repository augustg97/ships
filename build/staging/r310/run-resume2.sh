#!/bin/zsh
cd /Users/augustgweon/Ships
R=build/staging/r310
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
for i in 7 8 9 10 11 12 13 14; do
  prev=(); for j in $(seq 1 $((i-1))); do [ -d $R/run$j-current ] && prev+=($R/run$j-current); done; prev+=($R/recap-current)
  "$PY" $R/r310_resume.py $R/run$i-current $prev > $R/resume$i.out 2>&1
  rc=$?; echo "run $i rc $rc $(head -1 $R/resume$i.out) $(ls $R/run$i-current 2>/dev/null | wc -l)" >> $R/resume.log
  if grep -q '^0 frames to capture' $R/resume$i.out || [ $rc -eq 0 ]; then echo done > $R/resume.exit; exit 0; fi
done
echo gaveup > $R/resume.exit

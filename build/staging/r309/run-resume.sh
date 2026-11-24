#!/bin/zsh
# r309: resume runs back to back until every manifest frame is captured (each run dies on the first FRAME_READY timeout)
cd /Users/augustgweon/Ships
R=build/staging/r309
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
for i in 2 3 4 5 6 7 8 9; do
  prev=(); for j in $(seq 1 $((i-1))); do prev+=($R/run$j-current); done
  "$PY" $R/r309_resume.py $R/run$i-current $prev > $R/resume$i.out 2>&1
  rc=$?; echo "run $i rc $rc $(head -1 $R/resume$i.out) $(ls $R/run$i-current 2>/dev/null | wc -l)" >> $R/resume.log
  if grep -q '^0 frames to capture' $R/resume$i.out || [ $rc -eq 0 ]; then echo done > $R/resume.exit; exit 0; fi
done
echo gaveup > $R/resume.exit

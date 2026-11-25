#!/bin/zsh
# r314: capture r313's 8 unscored frames and ship-clipper, chained runs until all in
cd /Users/augustgweon/Ships
R=build/staging/r314
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
have=()
for d in build/staging/r313/allcur; do have+=($d); done
# drop ship-clipper from the have-set by making a filtered copy
rm -rf $R/have; mkdir $R/have; cp build/staging/r313/allcur/*.png $R/have/; rm -f $R/have/ship-clipper.png
for i in 1 2 3 4 5; do
  prev=($R/have); for j in $(seq 1 $((i-1))); do prev+=($R/bl$j-current); done
  "$PY" $R/r314_resume.py $R/bl$i-current $prev > $R/bl$i.out 2>&1
  rc=$?; echo "run $i rc $rc $(head -1 $R/bl$i.out) $(ls $R/bl$i-current 2>/dev/null | wc -l) $(date +%H:%M:%S)" >> $R/bl.log
  if grep -q '^0 frames to capture' $R/bl$i.out || [ $rc -eq 0 ]; then echo done > $R/bl.exit; exit 0; fi
done
echo gaveup > $R/bl.exit

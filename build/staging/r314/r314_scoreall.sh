#!/bin/zsh
# r314: score every captured frame once (the first copy captured), offline against the baselines
cd ~/Ships/build/staging/r314
rm -rf allcur; mkdir allcur
for d in run1-current run2-current run3-current run4-current run5-current run6-current run7-current run8-current; do
  [ -d $d ] || continue
  for f in $d/*.png; do [ -e allcur/$(basename $f) ] || cp $f allcur/; done
done
"/Users/augustgweon/Modeling Studio/.venv/bin/python" ../r277/score-offline.py allcur score-diff-all > score-all.out 2>&1
echo "$(ls allcur | wc -l) frames captured"; grep -v " ok$" score-all.out

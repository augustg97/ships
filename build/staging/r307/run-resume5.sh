#!/bin/zsh
cd /Users/augustgweon/Ships
R=build/staging/r307
FIRST=shipwright "/Users/augustgweon/Modeling Studio/.venv/bin/python" $R/r307_resume.py $R/run5-current $R/run1-current $R/run2-current $R/run3-current $R/run4-current > $R/resume5.out 2>&1
echo $? > $R/resume5.exit

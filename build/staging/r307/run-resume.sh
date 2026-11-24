#!/bin/zsh
cd /Users/augustgweon/Ships
R=build/staging/r307
FIRST=ship-titanic,aboard "/Users/augustgweon/Modeling Studio/.venv/bin/python" $R/r307_resume.py $R/run2-current $R/run1-current > $R/resume2.out 2>&1
echo $? > $R/resume2.exit

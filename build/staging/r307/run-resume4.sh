#!/bin/zsh
cd /Users/augustgweon/Ships
R=build/staging/r307
"/Users/augustgweon/Modeling Studio/.venv/bin/python" $R/r307_resume.py $R/run4-current $R/run1-current $R/run2-current $R/run3-current > $R/resume4.out 2>&1
echo $? > $R/resume4.exit

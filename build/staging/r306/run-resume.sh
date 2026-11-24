#!/bin/zsh
cd /Users/augustgweon/Ships
R=build/staging/r306
"/Users/augustgweon/Modeling Studio/.venv/bin/python" $R/r306_resume.py $R/run3-current $R/run1-current $R/run2-current > $R/resume3.out 2>&1
echo $? > $R/resume3.exit

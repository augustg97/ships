#!/bin/zsh
cd /Users/augustgweon/Ships
R=build/staging/r308
FIRST=board-salamis "/Users/augustgweon/Modeling Studio/.venv/bin/python" $R/r308_resume.py $R/run4-current $R/run1-current $R/run2-current $R/run3-current > $R/resume4.out 2>&1
echo $? > $R/resume4.exit

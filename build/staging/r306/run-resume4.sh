#!/bin/zsh
cd /Users/augustgweon/Ships
R=build/staging/r306
FIRST=ship-endurance,ship-wyoming,ship-azzam,aboard-off,globe-crossing,globe-modern "/Users/augustgweon/Modeling Studio/.venv/bin/python" $R/r306_resume.py $R/run4-current $R/run1-current $R/run2-current $R/run3-current > $R/resume4.out 2>&1
echo $? > $R/resume4.exit

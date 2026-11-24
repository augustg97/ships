#!/bin/zsh
cd /Users/augustgweon/Ships
"/Users/augustgweon/Modeling Studio/.venv/bin/python" "/Users/augustgweon/Modeling Studio/tools/frame_baseline.py" check --project /Users/augustgweon/Ships > build/staging/r301/ratchet.out 2>&1
echo $? > build/staging/r301/ratchet.exit

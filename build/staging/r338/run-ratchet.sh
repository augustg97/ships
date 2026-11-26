#!/bin/zsh
cd /Users/augustgweon/Ships
"/Users/augustgweon/Modeling Studio/.venv/bin/python" "/Users/augustgweon/Modeling Studio/tools/frame_baseline.py" check --project /Users/augustgweon/Ships > build/staging/r338/ratchet.out 2>&1
echo "RATCHET EXIT $? $(date +%T)" >> build/staging/r338/ratchet.out

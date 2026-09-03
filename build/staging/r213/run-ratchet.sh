#!/bin/bash
cd /Users/augustgweon/Ships
STUDIO="/Users/augustgweon/Modeling Studio"
echo "START $(date '+%H:%M:%S') load $(uptime | sed 's/.*load averages: //')" > build/staging/r213/close-ratchet.out
"$STUDIO/.venv/bin/python" "$STUDIO/tools/frame_baseline.py" check --project /Users/augustgweon/Ships >> build/staging/r213/close-ratchet.out 2> build/staging/r213/close-ratchet.err
echo "RATCHET EXIT $?  END $(date '+%H:%M:%S')" >> build/staging/r213/close-ratchet.out

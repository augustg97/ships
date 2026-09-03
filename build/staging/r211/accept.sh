#!/bin/bash
# usage: accept.sh <frame> "<reason>"
STUDIO="/Users/augustgweon/Modeling Studio"
"$STUDIO/.venv/bin/python" "$STUDIO/tools/frame_baseline.py" accept --project /Users/augustgweon/Ships --frame "$1" --reason "$2"

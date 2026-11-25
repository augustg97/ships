#!/bin/bash
cd /Users/augustgweon/Ships
echo "RATCHET START $(date)"
"/Users/augustgweon/Modeling Studio/.venv/bin/python" "/Users/augustgweon/Modeling Studio/tools/frame_baseline.py" check --project /Users/augustgweon/Ships
echo "RATCHET EXIT rc=$? $(date)"

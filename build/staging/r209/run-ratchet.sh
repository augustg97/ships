#!/bin/bash
cd /Users/augustgweon/Ships
STUDIO="/Users/augustgweon/Modeling Studio"
"$STUDIO/.venv/bin/python" "$STUDIO/tools/frame_baseline.py" check --project /Users/augustgweon/Ships > build/staging/r209/close-ratchet.out 2> build/staging/r209/close-ratchet.err
echo "RATCHET EXIT $?" >> build/staging/r209/close-ratchet.out

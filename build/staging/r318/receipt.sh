#!/bin/bash
# r318 receipt: score run2 so far, write the receipt into HANDOFF.md, commit, push.
cd /Users/augustgweon/Ships/build/staging/r318
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
cd /Users/augustgweon/Ships
cat build/staging/r318/receipt.md >> HANDOFF.md
git add HANDOFF.md Research/baselines/FRAME-LOG.md Research/baselines/frames/ship-great-eastern.png Research/baselines/frames/ship-clipper.png \
  Research/baselines/frames/aboard-clipper.png build/staging/r318/score-run1.out build/staging/r318/score-run2.out build/staging/r318/score-run3.out build/staging/r318/pair-ship-treasure.png build/staging/r318/receipt.sh \
  build/staging/r318/receipt.md build/staging/r318/pair-ship-clipper.png build/staging/r318/pair-aboard-clipper.png build/staging/r318/pair-great-eastern-diff.png
git commit -q -F build/staging/r318/receipt-msg.txt && git log --oneline -1 && git push origin main 2>&1 | tail -1

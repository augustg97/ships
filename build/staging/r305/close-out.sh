#!/bin/bash
# r305 close-out: move the staged after files into web/, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r305
cp $R/hull.after.js web/js/hull.js; cp $R/shipwright.after.js web/js/shipwright.js; cp Research/audit-hulls.js web/audit-hulls.js
cmp web/js/hull.js $R/hull.after.js; cmp web/js/shipwright.js $R/shipwright.after.js; cmp web/audit-hulls.js $R/audit-hulls.after.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: gaffTopShrouds $(grep -c 'gaffTopShrouds' docs/js/hull.js), rule $(grep -c 'a gaff topmast unstayed' docs/audit-hulls.js), card $(grep -c 'lower mastheads of the gaff masts' docs/js/shipwright.js)" | tee -a $R/close.log
python3 - "$R/handoff-entry.md" "$R/frames.md" <<'PY'
import sys; s=open(sys.argv[1]).read(); f=open(sys.argv[2]).read().strip()
s=s.replace('__FRAMES__', f)
open('/Users/augustgweon/Ships/HANDOFF.md','a').write(s)
PY
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/index.html web/js/hull.js web/js/shipwright.js web/audit-hulls.js Research/audit-hulls.js Research/baselines docs HANDOFF.md \
  $R/r305_edits.py $R/r305_audit.py $R/r305_probe.py $R/r305_cards.py $R/r305_witness.py $R/proofs.log \
  $R/proof-OLDFILE.out $R/proof-BROKEN.out $R/proof-FINAL.err $R/probe-after.json $R/cards-before.json $R/cards-after.json \
  $R/pair-endurance-heads.png $R/pair-wyoming-head-2x.png $R/wit-endurance-A.png \
  $R/close-out.sh $R/handoff-entry.md $R/frames.md $R/commit-msg.txt $R/run-ratchet.sh $R/ratchet.out
git commit -q -F $R/commit-msg.txt
git log --oneline -1

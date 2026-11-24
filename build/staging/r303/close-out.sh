#!/bin/bash
# r303 close-out: build docs/, stamp the handoff, commit the round's code, record, audit, docs and handoff.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r303
cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/audit-hulls.js $R/audit-hulls.after.js
cmp web/js/hull.js $R/hull.after.js; cmp web/js/shipwright.js $R/shipwright.after.js; cmp web/data/vessels.json $R/vessels.after.json
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: wellTop $(grep -c 'wellTop' docs/js/hull.js), rule $(grep -c 'a well recorded and its bulwark not built' docs/audit-hulls.js), wells $(grep -c 'Forward well' docs/data/vessels.json)" | tee -a $R/close.log
cat $R/handoff-entry.md >> HANDOFF.md
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/js/hull.js web/js/shipwright.js web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md \
  $R/r303_trace.py $R/r303_read.py $R/trace.json $R/wells.json $R/r303_apply.py $R/r303_audit.py $R/r303_proofs.py $R/proofs.log \
  $R/plan-fore.png $R/plan-aft.png $R/pair-forewell.png $R/pair-aftwell.png $R/quarter-aft-4x.png $R/quarter-fore-4x.png \
  $R/ms-after.out $R/close-out.sh $R/handoff-entry.md $R/commit-msg.txt $R/run-ratchet.sh
git commit -q -F $R/commit-msg.txt
git log --oneline -1

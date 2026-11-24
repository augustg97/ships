#!/bin/bash
# r300 close-out: build docs/, stamp the handoff, commit the record, audit, docs and handoff.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r300
cmp web/data/vessels.json $R/vessels.after.json; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/audit-hulls.js $R/audit-hulls.after.js; cmp web/js/hull.js $R/hull.after.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
WEB=$(grep -o 'name="data-version" content="[0-9]*"' web/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP web stamp $WEB" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: truckWLM $(grep -o '"truckWLM"' docs/data/vessels.json | wc -l | tr -d ' '), rule $(grep -o 'a pole built off its read truck' docs/audit-hulls.js | wc -l | tr -d ' '), builder $(grep -o 'mk.truckWLM - footY' docs/js/hull.js | wc -l | tr -d ' '), provenance 'PLATE READ, r300' $(grep -o 'PLATE READ, r300' docs/data/provenance.json | wc -l | tr -d ' ')" | tee -a $R/close.log
cat $R/handoff-entry.md >> HANDOFF.md
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/data/vessels.json web/js/hull.js web/audit-hulls.js Research/audit-hulls.js web/index.html docs HANDOFF.md $R/r300_read.py $R/trucks.json $R/r300-top-fore.png $R/r300-top-main.png $R/r300_apply.py $R/r300_proofs.py $R/proofs.log $R/pair-fore.png $R/pair-main.png $R/profile-after/starboard.png $R/ms-before.out $R/ms-after.out $R/close-out.sh $R/handoff-entry.md $R/commit-msg.txt
git commit -q -F $R/commit-msg.txt
git log --oneline -1

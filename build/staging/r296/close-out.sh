#!/bin/bash
# r296 close-out: build docs/, stamp the handoff, commit the record, builder, audit, docs and handoff.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r296
cmp web/js/hull.js $R/hull.after.js; cmp web/data/vessels.json $R/vessels.after.json; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/audit-hulls.js $R/audit-hulls.after.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
WEB=$(grep -o 'name="data-version" content="[0-9]*"' web/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP web stamp $WEB" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: funnelRead $(grep -o 'funnelRead' docs/data/vessels.json | wc -l | tr -d ' '), nest rule $(grep -o 'a crow.s nest off its mast' docs/audit-hulls.js | wc -l | tr -d ' '), provenance 'PLATE READ, r296' $(grep -o 'PLATE READ, r296' docs/data/provenance.json | wc -l | tr -d ' ')" | tee -a $R/close.log
cat $R/handoff-entry.md >> HANDOFF.md
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/data/vessels.json web/js/hull.js web/audit-hulls.js Research/audit-hulls.js web/index.html docs HANDOFF.md $R/r296_fit2.py $R/fit.json $R/r296_apply.py $R/r296_proofs.py $R/proofs.log $R/overlay-after.png $R/w-foremast.png $R/profile-final/starboard.png
git commit -q -F $R/commit-msg.txt
git log --oneline -1

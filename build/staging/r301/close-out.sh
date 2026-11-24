#!/bin/bash
# r301 close-out: build docs/, stamp the handoff, commit the round's code, record, audit, docs and handoff.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r301
cmp web/data/vessels.json $R/vessels.after.json; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/audit-hulls.js $R/audit-hulls.after.js
cmp web/js/shipwright.js $R/shipwright.after.js; cmp web/index.html $R/index.after.html; cmp web/css/styles.css $R/styles.after.css
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
WEB=$(grep -o 'name="data-version" content="[0-9]*"' web/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP web stamp $WEB" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: machinery $(grep -o '"machinery"' docs/data/vessels.json | wc -l | tr -d ' '), machineryProvenance in provenance.json $(grep -o 'machineryProvenance' docs/data/provenance.json | wc -l | tr -d ' '), rule $(grep -o 'a sailing card on a hull that sets no sail' docs/audit-hulls.js | wc -l | tr -d ' '), dispatch $(grep -o 'SW_STAGE_CARD' docs/js/shipwright.js | wc -l | tr -d ' '), nav-in-card $(grep -c 'swBuild"><div id="swNav"\|swBuild">' docs/index.html)" | tee -a $R/close.log
cat $R/handoff-entry.md >> HANDOFF.md
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/data/vessels.json web/js/shipwright.js web/index.html web/css/styles.css web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md \
  $R/r301_stages.py $R/stages.json $R/r301_apply_sw.py $R/r301_apply_rec.py $R/r301_proofs.py $R/proofs.log $R/r301_cards.py $R/cards-after.json \
  $R/cards-after-titanic-s7.png $R/cards-after-ever-given-s3.png $R/r301_measure_nav.py $R/nav-before.json $R/nav-after.json $R/close-out.sh $R/handoff-entry.md $R/commit-msg.txt $R/run-ratchet.sh
git commit -q -F $R/commit-msg.txt
git log --oneline -1

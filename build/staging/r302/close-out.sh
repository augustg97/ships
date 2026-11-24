#!/bin/bash
# r302 close-out: build docs/, stamp the handoff, commit the round's code, audit, docs and handoff.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r302
cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/audit-hulls.js $R/audit-hulls.after.js
cmp web/js/shipwright.js $R/shipwright.after.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: swSailCard $(grep -c 'swSailCard' docs/js/shipwright.js), SW_FURLED_CARD $(grep -c 'SW_FURLED_CARD' docs/js/shipwright.js), rule $(grep -c 'a sailing stage card that misstates' docs/audit-hulls.js), old fidded card $(grep -c 'each fidded through the doubling' docs/js/shipwright.js)" | tee -a $R/close.log
cat $R/handoff-entry.md >> HANDOFF.md
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/js/shipwright.js web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md \
  $R/r302_stages.py $R/stages.json $R/r302_apply_sw.py $R/r302_apply_sw2.py $R/r302_apply_sw3.py $R/r302_apply_sw4.py $R/r302_apply_sw5.py \
  $R/r302_apply_audit.py $R/r302_proofs.py $R/proofs.log $R/r302_cards.py $R/cards-before.json $R/cards-after.json \
  $R/cards-after-endurance-s6.png $R/sheet-cards.png $R/close-out.sh $R/handoff-entry.md $R/commit-msg.txt $R/run-ratchet.sh
git commit -q -F $R/commit-msg.txt
git log --oneline -1

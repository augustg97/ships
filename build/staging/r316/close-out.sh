#!/bin/bash
# r316 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r316
cmp web/audit-hulls.js $R/audit-hulls.after.js; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/js/hull.js $R/hull.after.js; cmp web/data/vessels.json $R/vessels.after.json
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: rule $(grep -c 'a set hoisting yard inside the doubling' docs/audit-hulls.js), builder $(grep -c 'fracRec.onCap' docs/js/hull.js), record $(grep -c 'set atrip' docs/data/vessels.json)" | tee -a $R/close.log
cat $R/handoff-entry.md >> HANDOFF.md
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/js/hull.js web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md web/index.html \
  $R/r316_builder.py $R/r316_record.py $R/r316_audit.py $R/r316_furl.py $R/r316_variant.py $R/r316_proofs.sh $R/r316_witness.py \
  $R/r316_probe.py $R/probe-before.json $R/probe-after.json $R/proofs.log $R/proof-*.out $R/audit-after.out \
  $R/pair-*.png $R/hurley-fullsail-q.jpg $R/close-out.sh $R/handoff-entry.md $R/commit-msg.txt
git commit -q -F $R/commit-msg.txt
git log --oneline -1

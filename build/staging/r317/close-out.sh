#!/bin/bash
# r317 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r317
cmp web/audit-hulls.js $R/audit.after.js; cmp Research/audit-hulls.js $R/audit.after.js; cmp web/js/hull.js $R/hull.after.js; cmp web/data/vessels.json $R/vessels.after.json; cmp web/js/shipwright.js $R/shipwright.after.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: rule $(grep -c 'a lateen mizzen recorded and not built' docs/audit-hulls.js), builder $(grep -c 'lateenMizzen' docs/js/hull.js), record $(grep -c 'lateenMizzen' docs/data/vessels.json), card $(grep -c 'under its topsail' docs/js/shipwright.js)" | tee -a $R/close.log
cat $R/handoff-entry.md >> HANDOFF.md
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/js/hull.js web/js/shipwright.js web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md web/index.html \
  $R/r317_builder.py $R/r317_record.py $R/r317_audit.py $R/r317_audit2.py $R/r317_card.py $R/r317_variant.py $R/r317_proofs.sh $R/r317_witness.py \
  $R/r317_probe.py $R/r317_probe2.py $R/r317_probe3.py $R/probe-after.json $R/proofs.log $R/proof-*.out $R/audit-after.out $R/audit-first.out \
  Research/baselines/frames/shipwright.png Research/baselines/FRAME-LOG.md $R/score-run1.out $R/r317_resume.py $R/r317_pair.py $R/crop-shipwright-*.png \
  $R/pair-*.png $R/crop-*-mizzen.png $R/w-*-after.png $R/close-out.sh $R/handoff-entry.md $R/commit-msg.txt
git commit -q -F $R/commit-msg.txt
git log --oneline -1

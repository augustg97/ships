#!/bin/bash
# r318 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r318
cmp web/audit-hulls.js $R/audit.after.js; cmp Research/audit-hulls.js $R/audit.after.js; cmp web/js/hull.js $R/hull.after.js; cmp web/data/vessels.json $R/vessels.after.json
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: rule $(grep -c 'two yards on a pole too short' docs/audit-hulls.js), builder $(grep -c 'squareStackOf' docs/js/hull.js), record $(grep -c 'mastHeightsM' docs/data/vessels.json), row $(grep -c 'masts, deck to truck' docs/data/vessels.json)" | tee -a $R/close.log
cat $R/handoff-entry.md >> HANDOFF.md
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/js/hull.js web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md web/index.html \
  $R/r318_builder.py $R/r318_record.py $R/r318_audit.py $R/r318_audit2.py $R/r318_variant.py $R/r318_proofs.sh $R/r318_witness.py \
  $R/r318_probe.py $R/r318_resume.py $R/probe-before.json $R/probe-after.json $R/probe-before.out $R/probe-after.out $R/proof-*.out \
  $R/audit-first.out $R/audit-second.out $R/score-a.out $R/score-b.out $R/pair-clipper.png $R/crop-clipper-rig.png $R/w-clipper-after.png \
  $R/close-out.sh $R/handoff-entry.md $R/commit-msg.txt $R/dl/sankey.html $R/dl/cutty-sark.wiki
git commit -q -F $R/commit-msg.txt
git log --oneline -1

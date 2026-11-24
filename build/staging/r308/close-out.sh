#!/bin/bash
# r308 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r308
cmp web/js/hull.js $R/hull.after.js; cmp web/audit-hulls.js $R/audit-hulls.after.js; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/data/vessels.json $R/vessels.after.json; cmp web/js/shipwright.js $R/shipwright.after.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: BOOMLESS $(grep -c "BOOMLESS" docs/js/hull.js), rule $(grep -c 'a brailed sail rolled on its boom' docs/audit-hulls.js), record $(grep -c 'furlStow' docs/data/vessels.json), card $(grep -c 'under gaffs left aloft' docs/js/shipwright.js)" | tee -a $R/close.log
python3 - "$R/handoff-entry.md" "$R/frames.md" "$R/proofs.md" <<'PY'
import sys; s=open(sys.argv[1]).read(); f=open(sys.argv[2]).read().strip(); pr=open(sys.argv[3]).read().strip()
s=s.replace('__FRAMES__', f).replace('__PROOFS__', pr)
assert '__FRAMES__' not in s and '__PROOFS__' not in s
open('/Users/augustgweon/Ships/HANDOFF.md','a').write(s)
PY
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/js/hull.js web/js/shipwright.js web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md \
  $R/r308_edits.py $R/r308_record.py $R/r308_audit.py $R/r308_card.py $R/r308_widths.py $R/r308_probe.py $R/probe-before.json $R/probe-after.json \
  $R/r308_proofs.sh $R/proofs.log $R/proof-*.out $R/proof-FINAL.err \
  $R/plate-mizzen-4x.png $R/a090007-mizzen-3x.png $R/a090007-mizzen-foot-4x.png $R/heeled-aft-3x.png \
  $R/pair-beam.png $R/pair-beam-mizzen.png $R/pair-q-mizzen.png $R/wit-after-q-small.png \
  $R/close-out.sh $R/handoff-entry.md $R/frames.md $R/proofs.md $R/commit-msg.txt $R/run-ratchet.sh
git commit -q -F $R/commit-msg.txt
git log --oneline -1

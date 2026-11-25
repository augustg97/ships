#!/bin/bash
# r315 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r315
cmp web/audit-hulls.js $R/audit-hulls.after.js; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/js/hull.js $R/hull.after.js; cmp web/js/shipwright.js $R/shipwright.after.js; cmp web/data/vessels.json $R/vessels.after.json
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: crossjack rule $(grep -c 'a sail set from a bare crossjack' docs/audit-hulls.js), card clause $(grep -c 'lowest yard) carries no sail' docs/js/shipwright.js), record $(grep -c 'crossjackProvenance' docs/data/vessels.json)" | tee -a $R/close.log
python3 - "$R/handoff-entry.md" "$R/frames.md" "$R/proofs.md" <<'PY'
import sys; s=open(sys.argv[1]).read(); f=open(sys.argv[2]).read().strip(); pr=open(sys.argv[3]).read().strip()
s=s.replace('__FRAMES__', f).replace('__PROOFS__', pr)
assert '__FRAMES__' not in s and '__PROOFS__' not in s
open('/Users/augustgweon/Ships/HANDOFF.md','a').write(s)
PY
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/js/hull.js web/js/shipwright.js web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md \
  Research/baselines/frames/shipwright.png Research/baselines/frames/shipwright-astern.png Research/baselines/frames/shipwright-hounds.png \
  Research/baselines/frames/shipwright-ahead.png Research/baselines/frames/ship-slave-ship.png Research/baselines/FRAME-LOG.md \
  $R/r315_builder.py $R/r315_record.py $R/r315_audit.py $R/r315_card.py $R/r315_variant.py $R/r315_proofs.sh $R/r315_proofs2.sh $R/r315_witness.py \
  $R/r315_probe.py $R/probe-before.txt $R/probe-after.txt $R/probe-before.json $R/probe-after.json $R/proofs.log $R/proof-*.out $R/audit-final.out \
  $R/r315_resume.py $R/run-resume.sh $R/score-early.out \
  $R/pair-*.png $R/card-after-furled.png \
  $R/close-out.sh $R/handoff-entry.md $R/frames.md $R/proofs.md $R/commit-msg.txt
git commit -q -F $R/commit-msg.txt
git log --oneline -1

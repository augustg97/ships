#!/bin/bash
# r314 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r314
cmp web/audit-hulls.js $R/audit-hulls.after.js; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/js/hull.js $R/hull.after.js; cmp web/js/shipwright.js $R/shipwright.after.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: lowered rule $(grep -c 'a furled hoisting yard left hoisted' docs/audit-hulls.js), card clause $(grep -c 'yards are lowered onto the caps below them' docs/js/shipwright.js)" | tee -a $R/close.log
python3 - "$R/handoff-entry.md" "$R/frames.md" "$R/proofs.md" <<'PY'
import sys; s=open(sys.argv[1]).read(); f=open(sys.argv[2]).read().strip(); pr=open(sys.argv[3]).read().strip()
s=s.replace('__FRAMES__', f).replace('__PROOFS__', pr)
assert '__FRAMES__' not in s and '__PROOFS__' not in s
open('/Users/augustgweon/Ships/HANDOFF.md','a').write(s)
PY
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/js/hull.js web/js/shipwright.js web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md \
  Research/baselines/frames/shipwright-furled.png Research/baselines/FRAME-LOG.md \
  $R/r314_builder.py $R/r314_audit.py $R/r314_audit_card.py $R/r314_card.py $R/r314_variant.py $R/r314_proofs.sh $R/r314_witness.py $R/r314_probe.py $R/probe-after.json $R/proofs.log $R/proof-*.out $R/audit-final.out \
  $R/r314_resume.py $R/r314_backlog.sh $R/run-resume.sh $R/score-bl.out $R/bl.log \
  $R/pair-rig-b110.png $R/pair-b110-small.png $R/pair-shipwright-furled.png \
  $R/close-out.sh $R/handoff-entry.md $R/frames.md $R/proofs.md $R/commit-msg.txt
git commit -q -F $R/commit-msg.txt
git log --oneline -1

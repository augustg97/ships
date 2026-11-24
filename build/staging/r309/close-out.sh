#!/bin/bash
# r309 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r309
cmp web/audit-hulls.js $R/audit-hulls.after.js; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/data/vessels.json $R/vessels.after.json; cmp web/js/hull.js $R/hull.before.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: rule $(grep -c 'a deck line trace that steps onto another line' docs/audit-hulls.js), house $(grep -c 'sheerRead ? SHIPS_HULL.hullSurface(H).sheer(0.5)' docs/audit-hulls.js), record maxStepRows $(grep -c 'maxStepRows' docs/data/vessels.json)" | tee -a $R/close.log
python3 - "$R/handoff-entry.md" "$R/frames.md" "$R/proofs.md" <<'PY'
import sys; s=open(sys.argv[1]).read(); f=open(sys.argv[2]).read().strip(); pr=open(sys.argv[3]).read().strip()
s=s.replace('__FRAMES__', f).replace('__PROOFS__', pr)
assert '__FRAMES__' not in s and '__PROOFS__' not in s
open('/Users/augustgweon/Ships/HANDOFF.md','a').write(s)
PY
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md \
  $R/r309_read.py $R/r309_local.py $R/r309_record.py $R/r309_audit.py $R/r309_crop.py $R/r309_resume.py $R/read.json $R/stations.json \
  $R/r309_proofs.sh $R/proofs.log $R/proof-*.out $R/proof-FINAL.err $R/ms-before.out $R/ms-after.out \
  $R/aftwell-plan-4x.png $R/forewell-plan-4x.png $R/aft-plan-2x.png \
  $R/pair-sb-aftwell.png $R/pair-q-aftwell.png $R/wit-after-q-small.png $R/sb-after-small.png \
  $R/close-out.sh $R/handoff-entry.md $R/frames.md $R/proofs.md $R/commit-msg.txt $R/run-ratchet.sh $R/run-resume.sh
git commit -q -F $R/commit-msg.txt
git log --oneline -1

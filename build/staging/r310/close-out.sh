#!/bin/bash
# r310 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r310
cmp web/audit-hulls.js $R/audit-hulls.after.js; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/data/vessels.json $R/vessels.after.json; cmp web/js/hull.js $R/hull.after.js; cmp web/js/shipwright.js $R/shipwright.after.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: lowered rule $(grep -c 'a lowered gaff standing aloft' docs/audit-hulls.js), silence $(grep -c 'a furled stowage with no read and no named silence' docs/audit-hulls.js), card $(grep -c 'the spanker is brailed in to the mast' docs/js/shipwright.js), vessels lowered $(grep -c '"furlStow":"lowered"' docs/data/vessels.json)" | tee -a $R/close.log
python3 - "$R/handoff-entry.md" "$R/frames.md" "$R/proofs.md" <<'PY'
import sys; s=open(sys.argv[1]).read(); f=open(sys.argv[2]).read().strip(); pr=open(sys.argv[3]).read().strip()
s=s.replace('__FRAMES__', f).replace('__PROOFS__', pr)
assert '__FRAMES__' not in s and '__PROOFS__' not in s
open('/Users/augustgweon/Ships/HANDOFF.md','a').write(s)
PY
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js web/js/hull.js web/js/shipwright.js docs HANDOFF.md Research/baselines/frames Research/baselines/FRAME-LOG.md \
  $R/r310_record.py $R/r310_audit.py $R/r310_proofs.sh $R/r310_proofs2.sh $R/proofs.log $R/proof-*.out $R/proof-FINAL2.err \
  $R/r310_witness.py $R/r310_resume.py $R/r310_recap.py $R/run-resume.sh $R/resume.log $R/score*.out \
  $R/crop-mizzen-3x.png $R/wit-clipper-stern-b320-4x.png $R/wit-b320-small.png \
  $R/close-out.sh $R/handoff-entry.md $R/frames.md $R/proofs.md $R/commit-msg.txt
git commit -q -F $R/commit-msg.txt
git log --oneline -1

#!/bin/bash
# r311 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r311
cmp web/audit-hulls.js $R/audit-hulls.after.js; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/data/vessels.json $R/vessels.after.json
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: plate-trace rule $(grep -c 'a plate trace that steps onto another line' docs/audit-hulls.js), wells refit $(grep -c 'r311 stored each well' docs/data/vessels.json)" | tee -a $R/close.log
python3 - "$R/handoff-entry.md" "$R/frames.md" "$R/proofs.md" <<'PY'
import sys; s=open(sys.argv[1]).read(); f=open(sys.argv[2]).read().strip(); pr=open(sys.argv[3]).read().strip()
s=s.replace('__FRAMES__', f).replace('__PROOFS__', pr)
assert '__FRAMES__' not in s and '__PROOFS__' not in s
open('/Users/augustgweon/Ships/HANDOFF.md','a').write(s)
PY
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md Research/baselines/frames Research/baselines/FRAME-LOG.md \
  $R/r311_retrace.py $R/retrace.json $R/r311_record.py $R/r311_audit.py $R/r311_variant.py $R/r311_proofs.sh $R/proofs.log $R/proof-*.out \
  $R/r311_resume.py $R/run-resume.sh $R/crop-aft-10x.png $R/crop-fore-10x.png $R/pair-q-wells-4x.png $R/wit-after-small.png \
  $R/close-out.sh $R/handoff-entry.md $R/frames.md $R/proofs.md $R/commit-msg.txt
git commit -q -F $R/commit-msg.txt
git log --oneline -1

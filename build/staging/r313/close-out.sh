#!/bin/bash
# r313 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r313
cmp web/audit-hulls.js $R/audit-hulls.after.js; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/data/vessels.json $R/vessels.after.json; cmp web/js/hull.js $R/hull.after.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: course rule $(grep -c 'a course height with no answer' docs/audit-hulls.js), Asow course read $(grep -c 'PLATE READ, r313' docs/data/vessels.json docs/data/provenance.json 2>/dev/null | tr '\n' ' ')" | tee -a $R/close.log
python3 - "$R/handoff-entry.md" "$R/frames.md" "$R/proofs.md" <<'PY'
import sys; s=open(sys.argv[1]).read(); f=open(sys.argv[2]).read().strip(); pr=open(sys.argv[3]).read().strip()
s=s.replace('__FRAMES__', f).replace('__PROOFS__', pr)
assert '__FRAMES__' not in s and '__PROOFS__' not in s
open('/Users/augustgweon/Ships/HANDOFF.md','a').write(s)
PY
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/data/vessels.json web/js/hull.js web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md \
  $R/r313_record.py $R/r313_builder.py $R/r313_audit.py $R/r313_variant.py $R/r313_proofs.sh $R/r313_witness.py $R/r313_probe.py $R/proofs.log $R/proof-*.out \
  $R/r313_resume.py $R/run-resume.sh $R/asow-rig-mid.png $R/asow-mz-top-4x.png $R/asow-mz-foot-4x.png \
  $R/pair-mizzen-b110.png $R/wit-after-small.png $R/wit-before-small.png \
  $R/close-out.sh $R/handoff-entry.md $R/frames.md $R/proofs.md $R/commit-msg.txt
git commit -q -F $R/commit-msg.txt
git log --oneline -1

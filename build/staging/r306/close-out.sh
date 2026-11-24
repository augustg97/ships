#!/bin/bash
# r306 close-out: check web/ carries the after files, build docs/, stamp the handoff, commit.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r306
cmp web/js/hull.js $R/hull.after.js; cmp web/audit-hulls.js $R/audit-hulls.after.js; cmp Research/audit-hulls.js $R/audit-hulls.after.js; cmp web/data/vessels.json $R/vessels.after.json
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: brailed $(grep -c "gaffStow === 'brailed'" docs/js/hull.js), rule $(grep -c 'canvas or a spar through a funnel' docs/audit-hulls.js), record $(grep -c 'gaffFrac' docs/data/vessels.json)" | tee -a $R/close.log
python3 - "$R/handoff-entry.md" "$R/frames.md" "$R/proofs.md" <<'PY'
import sys; s=open(sys.argv[1]).read(); f=open(sys.argv[2]).read().strip(); pr=open(sys.argv[3]).read().strip()
s=s.replace('__FRAMES__', f).replace('__PROOFS__', pr)
assert '__FRAMES__' not in s and '__PROOFS__' not in s
open('/Users/augustgweon/Ships/HANDOFF.md','a').write(s)
PY
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/js/hull.js web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js Research/baselines docs HANDOFF.md \
  $R/r306_record.py $R/r306_edits.py $R/r306_audit.py $R/r306_probe.py $R/r306_gaffread.py $R/gaffread.json $R/proofs.sh $R/proofs.log \
  $R/proof-OLDFILE.out $R/proof-SETMAIN.out $R/proof-FINAL.err $R/probe-before.json $R/probe-after.json \
  $R/plate-gaffs-4x.png $R/plate-main-foot-4x.png $R/pair-main-crop.png $R/wit-after-beam.png \
  $R/close-out.sh $R/handoff-entry.md $R/frames.md $R/proofs.md $R/commit-msg.txt $R/run-ratchet.sh $R/ratchet.out $R/r306_resume.py $R/run-resume.sh
git commit -q -F $R/commit-msg.txt
git log --oneline -1

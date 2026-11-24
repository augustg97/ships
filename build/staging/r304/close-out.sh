#!/bin/bash
# r304 close-out: build docs/, stamp the handoff, commit the round's code, record, audit, docs and handoff.
set -e
cd /Users/augustgweon/Ships
R=build/staging/r304
cmp web/js/hull.js $R/hull.after.js; cmp web/data/vessels.json $R/vessels.after.json; cmp web/audit-hulls.js Research/audit-hulls.js
python3 build/build_site.py > $R/build.out 2>&1 || { echo "BUILD FAILED"; tail -20 $R/build.out; exit 2; }
STAMP=$(grep -o 'name="data-version" content="[0-9]*"' docs/index.html | grep -o '[0-9]*')
echo "docs stamp $STAMP" | tee -a $R/close.log
grep -o 'first paint [0-9.]* MB' $R/build.out | tail -1 | tee -a $R/close.log
echo "docs: gaffTopmastOf $(grep -c 'gaffTopmastOf' docs/js/hull.js), rule $(grep -c 'a recorded gaff topmast not built' docs/audit-hulls.js), capFrac $(grep -c 'capFrac' docs/data/vessels.json)" | tee -a $R/close.log
python3 - "$R/handoff-entry.md" <<'PY'
import sys; s=open(sys.argv[1]).read()
s=s.replace('__FRAMES__','**THE FRAMES: the full ratchet runs beside this close on the round\'s tree; every moved frame is scored and classified in the receipt that follows.**')
open('/Users/augustgweon/Ships/HANDOFF.md','a').write(s)
PY
sed -i "" "s/__STAMP__/$STAMP/" HANDOFF.md
git add web/index.html web/js/hull.js web/data/vessels.json web/audit-hulls.js Research/audit-hulls.js docs HANDOFF.md \
  $R/r304_widths.py $R/r304_steps.py $R/steps.json $R/r304_edits.py $R/r304_audit_fix.py $R/r304_record.py $R/r304_proofs.py \
  $R/r304_probe.py $R/r304_yardpca.py $R/proofs.log $R/plate-steps-3x.png $R/heeled-main-mizzen.png $R/night-mainhead-2x.png \
  $R/pair-starboard.png $R/crop-after-heads-2x.png $R/profile-after/quarter.png $R/ms-before.out $R/ms-after.out $R/cards-after.json \
  $R/probe-after.json $R/close-out.sh $R/handoff-entry.md $R/commit-msg.txt $R/run-ratchet.sh
git commit -q -F $R/commit-msg.txt
git log --oneline -1

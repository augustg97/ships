#!/bin/zsh
cd ~/Ships/build/staging/r317
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ~/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc=$? $(tail -1 proof-$1.err)"; }
put() { cp $1 web/js/hull.js; cp $2 web/data/vessels.json; cp $3 web/audit-hulls.js; cp $4 web/js/shipwright.js; }
put hull.before.js vessels.before.json audit.before.js shipwright.before.js; run OLDALL-OLDAUDIT
put hull.before.js vessels.before.json audit.after.js shipwright.before.js; run OLDALL
put hull.before.js vessels.after.json audit.after.js shipwright.after.js; run RECORDNOTBUILT
python3 r317_variant.py NOSOURCE v-nosource.json; put hull.after.js v-nosource.json audit.after.js shipwright.after.js; run NOSOURCE
python3 r317_variant.py CLIPPERLATEEN v-clipper.json; put hull.after.js v-clipper.json audit.after.js shipwright.after.js; run CLIPPERLATEEN
put hull.after.js vessels.after.json audit.after.js shipwright.before.js; run OLDCARD
python3 r317_variant.py SEAMBIAS a-seam.js; put hull.after.js vessels.after.json a-seam.js shipwright.after.js; run SEAMBIAS
put hull.after.js vessels.after.json audit.after.js shipwright.after.js; run FINAL
cmp hull.after.js ~/Ships/web/js/hull.js && cmp vessels.after.json ~/Ships/web/data/vessels.json && cmp audit.after.js ~/Ships/web/audit-hulls.js && cmp shipwright.after.js ~/Ships/web/js/shipwright.js && echo web-unchanged

#!/bin/zsh
cd ~/Ships/build/staging/r314
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ~/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc=$? $(tail -1 proof-$1.err)"; }
python3 r314_variant.py hull.after.js web/js/hull.js HOISTED
cp audit-hulls.before.js web/audit-hulls.js; run HOISTED-OLDAUDIT
cp audit-hulls.after.js web/audit-hulls.js; run HOISTED
python3 r314_variant.py hull.after.js web/js/hull.js THROUGHCAP; run THROUGHCAP
python3 r314_variant.py hull.after.js web/js/hull.js SETLEAK; run SETLEAK
cp hull.after.js web/js/hull.js; cp audit-hulls.after.js web/audit-hulls.js; run FINAL
cmp hull.after.js web/js/hull.js && cmp audit-hulls.after.js web/audit-hulls.js && echo restored

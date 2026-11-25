#!/bin/zsh
cd ~/Ships/build/staging/r316
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ~/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc=$? $(tail -1 proof-$1.err)"; }
cp hull.before.js web/js/hull.js; cp vessels.before.json web/data/vessels.json
cp audit-hulls.before.js web/audit-hulls.js; run OLDBUILDER-OLDAUDIT
cp audit-hulls.after.js web/audit-hulls.js; run OLDBUILDER
cp vessels.after.json web/data/vessels.json
python3 r316_variant.py hull.after.js web/js/hull.js NOTATRIP; run NOTATRIP
python3 r316_variant.py hull.after.js web/js/hull.js OFFCAP; run OFFCAP
python3 r316_variant.py hull.after.js web/js/hull.js NOROLLREC; run NOROLLREC
cp hull.after.js web/js/hull.js
run FINAL
cmp hull.after.js web/js/hull.js && cmp audit-hulls.after.js web/audit-hulls.js && cmp vessels.after.json web/data/vessels.json && echo restored

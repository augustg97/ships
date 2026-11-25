#!/bin/zsh
cd ~/Ships/build/staging/r313
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ~/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc=$? $(tail -1 proof-$1.err)"; }
python3 r313_variant.py SILENCE vessels.after.json webB/data/vessels.json
cp audit-hulls.before.js webB/audit-hulls.js; run SILENCE-OLDAUDIT
cp audit-hulls.after.js webB/audit-hulls.js; run SILENCE
python3 r313_variant.py ROWS vessels.after.json webB/data/vessels.json; run ROWS
cp vessels.after.json webB/data/vessels.json
python3 r313_variant.py CLASSDRAWN hull.after.js webB/js/hull.js; run CLASSDRAWN
cp hull.after.js webB/js/hull.js; cp vessels.after.json webB/data/vessels.json; cp audit-hulls.after.js webB/audit-hulls.js
cmp hull.after.js webB/js/hull.js && cmp vessels.after.json webB/data/vessels.json && cmp audit-hulls.after.js webB/audit-hulls.js && echo restored

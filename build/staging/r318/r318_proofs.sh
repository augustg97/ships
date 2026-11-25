#!/bin/zsh
cd ~/Ships/build/staging/r318
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ~/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc=$? $(tail -1 proof-$1.err)"; }
put() { cp $1 web/js/hull.js; cp $2 web/data/vessels.json; cp $3 web/audit-hulls.js; }
put hull.before.js vessels.before.json audit.after.js; run OLDALL
python3 r318_variant.py NOSOURCE v-nosource.json; put hull.after.js v-nosource.json audit.after.js; run NOSOURCE
python3 r318_variant.py STEELSTACK h-steel.js; put h-steel.js vessels.after.json audit.after.js; run STEELSTACK
put hull.after.js vessels.after.json audit.after.js

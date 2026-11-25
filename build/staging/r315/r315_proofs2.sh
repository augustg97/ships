#!/bin/zsh
cd ~/Ships/build/staging/r315
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ~/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc=$? $(tail -1 proof-$1.err)"; }
echo "-- r315 card reworded at 18:59; CARD and FINAL re-run"
python3 r315_variant.py shipwright.after.js web/js/shipwright.js CARD; run CARD
cp shipwright.after.js web/js/shipwright.js
run FINAL
cp proof-FINAL.out audit-final.out
cmp hull.after.js web/js/hull.js && cmp audit-hulls.after.js web/audit-hulls.js && cmp vessels.after.json web/data/vessels.json && cmp shipwright.after.js web/js/shipwright.js && echo restored

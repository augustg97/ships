#!/bin/zsh
# r310 proofs, part 2: the card rule, and the final tree with every after file
cd /Users/augustgweon/Ships/build/staging/r310
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" /Users/augustgweon/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc $? $(tail -1 proof-$1.err)" >> proofs.log; }
after() { cp vessels.after.json webB/data/vessels.json; cp audit-hulls.after.js webB/audit-hulls.js; cp hull.after.js webB/js/hull.js; cp shipwright.after.js webB/js/shipwright.js; }
# OLDCARD: the r309 card, which leaves the spanker out
after; cp shipwright.before.js webB/js/shipwright.js; run OLDCARD
after; run FINAL2
echo done2 >> proofs.log

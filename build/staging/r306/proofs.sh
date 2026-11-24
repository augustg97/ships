#!/bin/zsh
cd /Users/augustgweon/Ships
R=build/staging/r306; W=$R/webB; PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { cp $2 $W/js/hull.js; cp $3 $W/data/vessels.json; AUDIT_URL=http://localhost:8150 "$PY" Research/run_audit.py > $R/proof-$1.out 2> $R/proof-$1.err; echo "$1 $(tail -1 $R/proof-$1.err)" >> $R/proofs.log; }
run OLDFILE $R/hull.before.js $R/vessels.after.json
run SETMAIN $R/hull.after.js $R/vessels.SETMAIN.json
run FINAL $R/hull.after.js $R/vessels.after.json
cp $R/hull.before.js $W/js/hull.js; cp $R/vessels.before.json $W/data/vessels.json
echo DONE >> $R/proofs.log

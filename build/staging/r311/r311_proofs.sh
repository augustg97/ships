#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r311
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" /Users/augustgweon/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc $? $(tail -1 proof-$1.err)" >> proofs.log; }
for p in OLDTRACE SILENCE ROWS JUMP; do
  python3 r311_variant.py vessels.after.json webB/data/vessels.json.tmp $p && mv webB/data/vessels.json.tmp webB/data/vessels.json
  run $p
done
cp vessels.after.json webB/data/vessels.json; run FINAL
cmp vessels.after.json webB/data/vessels.json && echo restored >> proofs.log

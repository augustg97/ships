#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r312
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" /Users/augustgweon/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc $? $(tail -1 proof-$1.err)" >> proofs.log; }
# NOREAD on the r311 audit (the gap) and on the new one
python3 r312_variant.py vessels.after.json webB/data/vessels.json.tmp NOREAD && mv webB/data/vessels.json.tmp webB/data/vessels.json
cp audit-hulls.before.js webB/audit-hulls.js; run NOREAD-OLDAUDIT
cp audit-hulls.after.js webB/audit-hulls.js; run NOREAD
cp vessels.after.json webB/data/vessels.json
# proof C: the builder copy draws a square mast's brailed spanker the old way (lowered onto a roll)
python3 - <<'PY'
p='webB/js/hull.js'; s=open(p).read()
a="const BRAILED = BOOMLESS || (FURLED && mk.furlStow === 'brailed');"
assert s.count(a)==1; open(p,'w').write(s.replace(a,"const BRAILED = BOOMLESS || (FURLED && mk.furlStow === 'brailed' && mk.rig !== 'square');"))
PY
run LOWEREDDRAWN
cp hull.after.js webB/js/hull.js
run FINAL
cmp vessels.after.json webB/data/vessels.json && cmp hull.after.js webB/js/hull.js && cmp audit-hulls.after.js webB/audit-hulls.js && echo restored >> proofs.log

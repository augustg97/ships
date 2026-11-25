#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r328
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
W=/Users/augustgweon/Ships/web
run() { AUDIT_URL=http://localhost:8150 "$PY" ../r240/run_audit_url.py > $1.out 2> $1.err; echo "$1 rc=$? $(tail -1 $1.err)"; }
reset() { cp $W/js/hull.js webb/js/hull.js; cp $W/data/vessels.json webb/data/vessels.json; cp $W/audit-hulls.js webb/audit-hulls.js; }
reset; cp hull.before.js webb/js/hull.js; run proofA
reset; python3 - <<'P'
p='webb/js/hull.js'; s=open(p).read(); o="const ltHead = ltY + LT.headOverTop * (ltY - base);"
assert s.count(o)==1; open(p,'w').write(s.replace(o,"const ltHead = ltY + 0.8 * LT.headOverTop * (ltY - base);"))
P
run proofB
reset; python3 - <<'P'
import json; p='webb/data/vessels.json'; d=json.load(open(p))
m=[v for v in d['vessels'] if v['id']=='carrack'][0]['hull']['masts'][2]; del m['mizzenTopsail']; del m['mizzenTopsailProvenance']
json.dump(d,open(p,'w'),ensure_ascii=False)
P
run proofC
reset; cp audit-hulls.before.js webb/audit-hulls.js; run proofD
reset; echo PROOFS-DONE

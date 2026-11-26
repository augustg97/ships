#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r333
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ../r240/run_audit_url.py > $1.out 2> $1.err; echo "$1 rc=$? $(tail -1 $1.err)"; }
reset() { cp after/hull.js webb/js/hull.js; cp after/vessels.json webb/data/vessels.json; cp after/audit-hulls.js webb/audit-hulls.js; }
rec() { python3 - "$1" <<'Q'
import json, sys; p='webb/data/vessels.json'; d=json.load(open(p)); k=sys.argv[1]
V={v['id']:v for v in d['vessels']}; ms=V['fluyt']['hull']['masts']
if k=='B': ms[1]['at']=0.556
if k=='C': ms[2]['lateenRead']['rows']['heel'][0]+=10
if k=='E': V['east-indiaman']['hull']['masts'][1]['at']=0.53
if k=='E2':
  V['east-indiaman']['hull']['masts'][1]['at']=0.53; V['east-indiaman']['hull']['masts'][1]['atProvenance']='CONTESTED, proof: the record answers'
open(p,'w').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
Q
}
hb() { python3 - "$1" "$2" <<'Q'
import sys; p='webb/js/hull.js'; s=open(p).read(); a,b=sys.argv[1],sys.argv[2]; assert s.count(a)==1, a
open(p,'w').write(s.replace(a,b))
Q
}
reset; cp before/vessels.json webb/data/vessels.json; run proofA
reset; rec B; run proofB
reset; rec C; run proofC
reset; cp before/audit-hulls.js webb/audit-hulls.js; run proofD
reset; rec E; run proofE
reset; rec E2; run proofE2
reset; hb "const th = lr ? lr.angleDeg * Math.PI / 180" "const th = lr ? 42.1 * Math.PI / 180"; run proofF
reset; echo PROOFS-DONE

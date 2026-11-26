#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r334
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ../r240/run_audit_url.py > $1.out 2> $1.err; echo "$1 rc=$? $(tail -1 $1.err)"; }
reset() { cp before/hull.js webb/js/hull.js; cp after/vessels.json webb/data/vessels.json; cp after/audit-hulls.js webb/audit-hulls.js; }
rec() { python3 - "$1" <<'Q'
import json, sys; p='webb/data/vessels.json'; d=json.load(open(p)); k=sys.argv[1]
V={v['id']:v for v in d['vessels']}; SR=V['fluyt']['hull']['sheerRead']
if k=='B': del SR['trace']['breaks']
if k=='C': SR['trace']['breaks'][0]['why']=''
if k=='D': del SR['trace']['stationWindowCols']
if k=='E': SR['rows'][19]+=3
if k=='H': del SR['trace']['breakStations']
open(p,'w').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
Q
}
hb() { python3 - "$1" "$2" <<'Q'
import sys; p='webb/js/hull.js'; s=open(p).read(); a,b=sys.argv[1],sys.argv[2]; assert s.count(a)==1, a
open(p,'w').write(s.replace(a,b))
Q
}
reset; rec B; run proofB
reset; rec C; run proofC
reset; rec D; run proofD
reset; rec E; run proofE
reset; rec H; run proofH
reset; hb "const base = SR ? SR(u) :" "const base = false ? SR(u) :"; run proofF
reset; cp before/audit-hulls.js webb/audit-hulls.js; run proofG
echo PROOFS-DONE

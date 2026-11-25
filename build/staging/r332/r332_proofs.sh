#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r332
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ../r240/run_audit_url.py > $1.out 2> $1.err; echo "$1 rc=$? $(tail -1 $1.err)"; }
reset() { cp after/hull.js webb/js/hull.js; cp after/vessels.json webb/data/vessels.json; cp after/audit-hulls.js webb/audit-hulls.js; }
rec() { python3 - "$1" <<'Q'
import json, sys; p='webb/data/vessels.json'; d=json.load(open(p))
ms=[v for v in d['vessels'] if v['id']=='fluyt'][0]['hull']['masts']; k=sys.argv[1]
if k=='C': ms[0]['uncrossedAtSeaProvenance']='UNREAD'
if k=='E': ms[1]['uncrossedAtSea']=['topgallantMast','royal']
open(p,'w').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
Q
}
hb() { python3 - "$1" "$2" <<'Q'
import sys; p='webb/js/hull.js'; s=open(p).read(); a,b=sys.argv[1],sys.argv[2]; assert s.count(a)==1, a
open(p,'w').write(s.replace(a,b))
Q
}
G="if (secKey && !FURLED && Array.isArray(mk.uncrossedAtSea) && mk.uncrossedAtSea.includes(secKey)) {"
reset; hb "$G" "if (false && secKey && !FURLED && Array.isArray(mk.uncrossedAtSea) && mk.uncrossedAtSea.includes(secKey)) {"; run proofA
reset; hb "$G" "if (secKey && Array.isArray(mk.uncrossedAtSea) && mk.uncrossedAtSea.includes(secKey)) {"; run proofB
reset; rec C; run proofC
reset; cp audit-hulls.before.js webb/audit-hulls.js; run proofD
reset; rec E; run proofE
reset; echo PROOFS-DONE

#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r331
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ../r240/run_audit_url.py > $1.out 2> $1.err; echo "$1 rc=$? $(tail -1 $1.err)"; }
reset() { cp after/hull.js webb/js/hull.js; cp after/vessels.json webb/data/vessels.json; cp after/audit-hulls.js webb/audit-hulls.js; }
rec() { python3 - "$1" <<'Q'
import json, sys; p='webb/data/vessels.json'; d=json.load(open(p))
ms=[v for v in d['vessels'] if v['id']=='fluyt'][0]['hull']['masts']; k=sys.argv[1]
if k=='A': ms[0]['hoistRead']['topgallantMast']['ofFootToHead']=0.95
if k=='B':   # the fore topsail read against the topmast's head on row 300, a misread cap, share recomputed to agree with its rows
    e=ms[0]['hoistRead']['topmast']; e['rows']['head']=300; e['ofFootToHead']=round((902-339.6)/(902-300),4)
if k=='E': ms[1]['hoistRead']['topgallantMast']['unread']='UNREAD'
open(p,'w').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
Q
}
reset; rec A; run proofA
reset; rec B; run proofB
reset; python3 - <<'Q'
p='webb/js/hull.js'; s=open(p).read(); a="if (hr && typeof hr.ofFootToHead === 'number') hoistY ="; assert s.count(a)==1
open(p,'w').write(s.replace(a,"if (false && hr && typeof hr.ofFootToHead === 'number') hoistY ="))
Q
run proofC
reset; rec B; cp audit-hulls.before.js webb/audit-hulls.js; run proofD
reset; cp audit-hulls.before.js webb/audit-hulls.js; run proofE0
reset; rec E; run proofE
reset; echo PROOFS-DONE

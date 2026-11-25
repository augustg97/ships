#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r330
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" ../r240/run_audit_url.py > $1.out 2> $1.err; echo "$1 rc=$? $(tail -1 $1.err)"; }
reset() { cp after/hull.js webb/js/hull.js; cp after/vessels.json webb/data/vessels.json; cp after/audit-hulls.js webb/audit-hulls.js; }
r329top() { python3 - "$1" <<'Q'
import json, sys; p='webb/data/vessels.json'; d=json.load(open(p))
m=[v for v in d['vessels'] if v['id']=='fluyt'][0]['hull']['masts'][0]
m['mastHeightsRead']['rows']['top']=600; m['mastHeightsRead']['ofForeMizzenSpacing']['top']=0.3887; m['mastHeightsM']['top']=8.37
if sys.argv[1]=='B':
    m['courseRead']['rows']['top']=600; m['courseRead']['ofDeckToTop']=round((902-604)/(902-600),3)
json.dump(d,open(p,'w'),ensure_ascii=False)
Q
}
reset; r329top A; run proofA
reset; r329top B; run proofB
reset; python3 - <<'Q'
p='webb/js/hull.js'; s=open(p).read(); a='if (rd) courseAt = rd.ofDeckToTop * 0.90;'; assert s.count(a)==1
open(p,'w').write(s.replace(a,'if (false && rd) courseAt = rd.ofDeckToTop * 0.90;'))
Q
run proofC
reset; r329top A; cp audit-hulls.before.js webb/audit-hulls.js; run proofD
reset; echo PROOFS-DONE

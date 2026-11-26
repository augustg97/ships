#!/bin/bash
cd /Users/augustgweon/Ships/build/staging/r337
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" /Users/augustgweon/Ships/Research/run_audit.py > $1.out 2> $1.err; echo "$1 rc=$? $(tail -1 $1.err) :: $(python3 -c "import json,collections;print(dict(collections.Counter(p.get('problem',p.get('what','?')) if isinstance(p,dict) else str(p)[:60] for p in json.load(open('$1.out')))))")"; }
restore() { cp good/hull.js webb/js/hull.js; cp good/vessels.json webb/data/vessels.json; cp good/audit-hulls.js webb/audit-hulls.js; }
# B: builder ignores the read (class wale drawn)
restore; python3 - <<'P'
p='webb/js/hull.js'; s=open(p).read(); a="const rv = readWaleV(S, hullSurface(S));"; assert s.count(a)==1; open(p,'w').write(s.replace(a,"const rv = null;"))
P
run proofB
# E: builder lays the wale 0.3 m high
restore; python3 - <<'P'
p='webb/js/hull.js'; s=open(p).read(); a="const vAt = u => 0.62 + 0.38 * hAt(u) / fb(u);"; assert s.count(a)==1; open(p,'w').write(s.replace(a,"const vAt = u => 0.62 + 0.38 * (hAt(u) + 0.3) / fb(u);"))
P
run proofE
# C: one station's height moved 0.2 m (row unchanged)
restore; python3 - <<'P'
import json; p='webb/data/vessels.json'; d=json.load(open(p)); v=[x for x in d['vessels'] if x['id']=='fluyt'][0]
v['hull']['waleRead']['stations'][10][1]+=0.2; open(p,'w').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
P
run proofC
# D: a 6-row jump in the trace near column 1300 and its station row moved with it
restore; python3 - <<'P'
import json; p='webb/data/vessels.json'; d=json.load(open(p)); v=[x for x in d['vessels'] if x['id']=='fluyt'][0]; T=v['hull']['waleRead']['trace']
i0=(1300-T['fromCol'])//T['stepCol']
for i in range(i0,i0+30): T['rows'][i]+=6
open(p,'w').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
P
run proofD
# G: r336's audit with this round's tree (silent: shows the old audit cannot see the field)
restore; cp audit.before.js webb/audit-hulls.js; python3 - <<'P'
p='webb/js/hull.js'; s=open(p).read(); a="const rv = readWaleV(S, hullSurface(S));"; open(p,'w').write(s.replace(a,"const rv = null;"))
P
run proofG
restore; cmp good/hull.js webb/js/hull.js && cmp good/vessels.json webb/data/vessels.json && cmp good/audit-hulls.js webb/audit-hulls.js && echo restored

#!/bin/bash
cd /Users/augustgweon/Ships/build/staging/r337
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" /Users/augustgweon/Ships/build/staging/r240/run_audit_url.py > $1.out 2> $1.err; echo "$1 rc=$? $(tail -1 $1.err) :: $(python3 -c "import json,collections;print(dict(collections.Counter(p.get('problem',p.get('what','?')) if isinstance(p,dict) else str(p)[:60] for p in json.load(open('$1.out')))))")"; }
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
restore; cmp good/hull.js webb/js/hull.js && cmp good/vessels.json webb/data/vessels.json && cmp good/audit-hulls.js webb/audit-hulls.js && echo restored

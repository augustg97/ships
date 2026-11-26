#!/bin/bash
cd /Users/augustgweon/Ships
R=build/staging/r341
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { "$PY" build/staging/r240/run_audit_url.py > $R/$1.out 2> $R/$1.err; echo "$1 rc=$? $(tail -1 $R/$1.err)"; python3 -c "import json,collections;print(dict(collections.Counter(p.get('problem','?') for p in json.load(open('$R/$1.out')))))"; }
echo "$(date +%T) audit A"; run auditA
echo "$(date +%T) witness after"; WURL=http://localhost:8149 bash $R/scripts/wit.sh after
cp $R/hull.before.js web/js/hull.js; cp $R/shaders.before.js web/js/shaders.js
echo "$(date +%T) proof B"; run proofB
cp $R/good-hull.js web/js/hull.js; cp $R/good-shaders.js web/js/shaders.js
cmp $R/good-hull.js web/js/hull.js && cmp $R/good-shaders.js web/js/shaders.js && echo RESTORED
echo "CHAIN-DONE $(date +%T)"

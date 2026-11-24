#!/bin/zsh
# r307 proofs on the :8150 copy (webB). Each swaps files in, runs the audit, restores the after files.
cd /Users/augustgweon/Ships/build/staging/r307
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" /Users/augustgweon/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc $? $(tail -1 proof-$1.err)" >> proofs.log; }
after() { cp hull.after.js webB/js/hull.js; cp vessels.after.json webB/data/vessels.json; cp shipwright.after.js webB/js/shipwright.js; }
: > proofs.log
after; cp hull.before.js webB/js/hull.js; run OLDFILE
after; python3 -c "
import json; D=json.load(open('vessels.after.json')); h=[x for x in D['vessels'] if x['id']=='titanic'][0]['hull']; del h['capM']
open('webB/data/vessels.json','w').write(json.dumps(D,indent=2,ensure_ascii=False)+'\n')"; run NOCAPM
after; python3 -c "
import json; D=json.load(open('vessels.after.json')); h=[x for x in D['vessels'] if x['id']=='titanic'][0]['hull']; del h['islands']['wells'][0]['ports']
open('webB/data/vessels.json','w').write(json.dumps(D,indent=2,ensure_ascii=False)+'\n')"; run SILENCE
after; python3 -c "
import json; D=json.load(open('vessels.after.json')); h=[x for x in D['vessels'] if x['id']=='titanic'][0]['hull']; h['islands']['wells'][1]['ports'][0]['topM']+=0.2
open('webB/data/vessels.json','w').write(json.dumps(D,indent=2,ensure_ascii=False)+'\n')"; run OFFROW
after; run FINAL

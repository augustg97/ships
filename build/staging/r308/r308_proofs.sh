#!/bin/zsh
# r308 proofs on the :8150 copy (webB). Each swaps files in, runs the audit, restores the after files.
cd /Users/augustgweon/Ships/build/staging/r308
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" /Users/augustgweon/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc $? $(tail -1 proof-$1.err)" >> proofs.log; }
after() { cp hull.after.js webB/js/hull.js; cp vessels.after.json webB/data/vessels.json; cp shipwright.after.js webB/js/shipwright.js; cp audit-hulls.after.js webB/audit-hulls.js; }
: > proofs.log
after; cp hull.before.js webB/js/hull.js; run OLDFILE
after; cp shipwright.before.js webB/js/shipwright.js; run OLDCARD
after; python3 -c "
import json; D=json.load(open('vessels.after.json')); m=[x for x in D['vessels'] if x['id']=='endurance'][0]['hull']['masts'][2]; del m['furlStowProvenance']
open('webB/data/vessels.json','w').write(json.dumps(D,indent=2,ensure_ascii=False)+'\n')"; run NOPROV
after; python3 -c "
s=open('hull.after.js').read(); o=\"const BRAILED = BOOMLESS || (FURLED && mk.furlStow === 'brailed');\"; assert s.count(o)==1
open('webB/js/hull.js','w').write(s.replace(o, \"const BRAILED = BOOMLESS || mk.furlStow === 'brailed';\"))"; run SETBRAIL
after; run FINAL

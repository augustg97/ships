#!/bin/zsh
# r309 proofs on the :8150 copy (webB). Each swaps a broken record in, runs the after audit, restores.
cd /Users/augustgweon/Ships/build/staging/r309
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" /Users/augustgweon/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc $? $(tail -1 proof-$1.err)" >> proofs.log; }
after() { cp vessels.after.json webB/data/vessels.json; cp audit-hulls.after.js webB/audit-hulls.js; }
: > proofs.log
# OLDTRACE: r299's trace (which steps onto the solid line at column 790) and r299's stations, rows and datum rows
after; python3 -c "
import json; D=json.load(open('vessels.after.json')); B=json.load(open('vessels.before.json')); o=json.load(open('../r299/read.json'))
h=[x for x in D['vessels'] if x['id']=='titanic'][0]['hull']; hb=[x for x in B['vessels'] if x['id']=='titanic'][0]['hull']
for k in ['stations','rows','datumRows']: h['sheerRead'][k]=hb['sheerRead'][k]
h['sheerRead']['trace']['rows']=[r for c,r in o['trace']]; assert len(o['trace'])==346
h['deckM']=hb['deckM']
open('webB/data/vessels.json','w').write(json.dumps(D,indent=2,ensure_ascii=False)+'\n')"; run OLDTRACE
# SILENCE: the trace deleted
after; python3 -c "
import json; D=json.load(open('vessels.after.json')); h=[x for x in D['vessels'] if x['id']=='titanic'][0]['hull']; del h['sheerRead']['trace']
open('webB/data/vessels.json','w').write(json.dumps(D,indent=2,ensure_ascii=False)+'\n')"; run SILENCE
# HOUSE: deckM 3.4, so the house derives 0.77 m over the recorded boat deck from the read sheer
after; python3 -c "
import json; D=json.load(open('vessels.after.json')); h=[x for x in D['vessels'] if x['id']=='titanic'][0]['hull']; h['deckM']=3.4
open('webB/data/vessels.json','w').write(json.dumps(D,indent=2,ensure_ascii=False)+'\n')"; run HOUSE
after; run FINAL
echo done >> proofs.log

#!/bin/zsh
# r310 proofs on the :8150 copy (webB). Each swaps a broken record or builder in, runs the after audit, restores.
cd /Users/augustgweon/Ships/build/staging/r310
PY="/Users/augustgweon/Modeling Studio/.venv/bin/python"
run() { AUDIT_URL=http://localhost:8150 "$PY" /Users/augustgweon/Ships/Research/run_audit.py > proof-$1.out 2> proof-$1.err; echo "$1 rc $? $(tail -1 proof-$1.err)" >> proofs.log; }
after() { cp vessels.after.json webB/data/vessels.json; cp audit-hulls.after.js webB/audit-hulls.js; cp hull.after.js webB/js/hull.js; }
edit() { python3 -c "
import json,sys; D=json.load(open('vessels.after.json')); V={v['id']:v for v in D['vessels']}
exec(sys.argv[1])
open('webB/data/vessels.json','w').write(json.dumps(D,indent=2,ensure_ascii=False)+'\n')" "$1"; }
: > proofs.log
# BRAILED (proof C): the builder copy draws the clipper's 'lowered' spanker brailed, gaff aloft
after; python3 -c "
s=open('hull.after.js').read(); a=\"const BRAILED = BOOMLESS || (FURLED && mk.furlStow === 'brailed');\"; assert s.count(a)==1
open('webB/js/hull.js','w').write(s.replace(a,\"const BRAILED = BOOMLESS || (FURLED && (mk.furlStow === 'brailed' || mk.furlStow === 'lowered'));\"))"; run BRAILED
# SILENCE: the 74's spanker loses its UNREAD provenance
after; edit "del V['ship-of-the-line']['hull']['masts'][2]['furlStowProvenance']"; run SILENCE
# NOREAD: the clipper says 'lowered' over an UNREAD provenance
after; edit "m=V['clipper']['hull']['masts'][2]; m['furlStowProvenance']='UNREAD, test'"; run NOREAD
# UNKNOWN: a stowage the builder does not draw
after; edit "V['clipper']['hull']['masts'][2]['furlStow']='struck'"; run UNKNOWN
after; run FINAL
echo done >> proofs.log

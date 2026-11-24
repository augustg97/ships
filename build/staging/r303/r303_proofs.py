# r303 proofs: each fault is written into the :8150 copy, the audit run, and the copy restored.
import subprocess, os, json
from collections import Counter
R='/Users/augustgweon/Ships/build/staging/r303/'; PY='/Users/augustgweon/Modeling Studio/.venv/bin/python'
HULL=R+'web/js/hull.js'; VES=R+'web/data/vessels.json'
fh=open(HULL).read(); fv=open(VES).read(); old_h=open(R+'hull.before.js').read()
def run(tag):
    env=dict(os.environ,AUDIT_URL='http://localhost:8150')
    p=subprocess.run([PY,'/Users/augustgweon/Ships/Research/run_audit.py'],capture_output=True,text=True,env=env)
    open(R+f'proof-{tag}.out','w').write(p.stdout); open(R+f'proof-{tag}.err','w').write(p.stderr)
    probs=json.loads(p.stdout or '[]')
    c=Counter(f"{q.get('id')}: {q.get('rule')}" for q in probs)
    line=f"{tag}: {p.stderr.strip().splitlines()[-1] if p.stderr.strip() else '?'}; " + '; '.join(f'{k} x{n}' for k,n in sorted(c.items()))
    print(line,flush=True); open(R+'proofs.log','a').write(line+'\n')
def ves(edit):
    d=json.loads(fv); edit(d); open(VES,'w').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
tit=lambda d:[v for v in d['vessels'] if v['id']=='titanic'][0]['hull']
def hsub(a,b):
    assert fh.count(a)==1, a; open(HULL,'w').write(fh.replace(a,b))
try:
    open(HULL,'w').write(old_h); run('OLDFILE'); open(HULL,'w').write(fh)
    hsub("for (const w of (S.islands.wells || [])) {","for (const w of []) {"); run('NOBULWARK'); open(HULL,'w').write(fh)
    hsub("return w !== null ? w - capH : H.sheer(u); };","return H.sheer(u); };"); run('OLDCAP'); open(HULL,'w').write(fh)
    def offrow(d): tit(d)['islands']['wells'][1]['topM'][0]=10.5
    ves(offrow); run('OFFROW')
    def silence(d): del tit(d)['islands']['wells']
    ves(silence); run('SILENCE')
finally:
    open(HULL,'w').write(fh); open(VES,'w').write(fv)
run('FINAL')

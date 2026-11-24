# r300 proofs: each fault is written into the :8150 copy, the audit run, and the copy restored.
import subprocess, os, json
R='/Users/augustgweon/Ships/build/staging/r300/'; PY='/Users/augustgweon/Modeling Studio/.venv/bin/python'
HULL=R+'w8150/web/js/hull.js'; VES=R+'w8150/web/data/vessels.json'
fh=open(HULL).read(); fv=open(VES).read()
def run(tag):
    env=dict(os.environ,AUDIT_URL='http://localhost:8150')
    p=subprocess.run([PY,'/Users/augustgweon/Ships/Research/run_audit.py'],capture_output=True,text=True,env=env)
    open(R+f'proof-{tag}.out','w').write(p.stdout); open(R+f'proof-{tag}.err','w').write(p.stderr)
    probs=json.loads(p.stdout or '[]')
    from collections import Counter
    c=Counter(f"{q.get('id')}: {q.get('rule')}" for q in probs)
    line=f"{tag}: {p.stderr.strip().splitlines()[-1] if p.stderr.strip() else '?'}; " + '; '.join(f'{k} x{n}' for k,n in sorted(c.items()))
    print(line,flush=True); open(R+'proofs.log','a').write(line+'\n')
def ves(edit):
    d=json.loads(fv); edit(d); open(VES,'w').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
tit=lambda d:[v for v in d['vessels'] if v['id']=='titanic'][0]['hull']
old="    return footY !== undefined ? mk.truckWLM - footY : 0;"
assert fh.count(old)==1
try:
    open(HULL,'w').write(fh.replace(old,"    return 52.2;")); run('OLDHEIGHT')
    open(HULL,'w').write(fh)
    def offrow(d): tit(d)['masts'][0]['truckWLM']=62.0
    ves(offrow); run('OFFROW')
    def silence(d):
        m=tit(d)['masts'][1]; del m['truckWLM']; del m['truckRead']; m['heightM']=52.2
    ves(silence); run('SILENCE')
    def norows(d): del tit(d)['masts'][0]['truckRead']
    ves(norows); run('NOROWS')
finally:
    open(HULL,'w').write(fh); open(VES,'w').write(fv)
run('FINAL')

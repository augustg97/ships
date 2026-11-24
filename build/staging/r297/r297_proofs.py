# r297 proofs: each fault is written into the :8150 copy, the audit run, and the final tree restored.
import subprocess, os, json, shutil
R='/Users/augustgweon/Ships/build/staging/r297/'; PY='/Users/augustgweon/Modeling Studio/.venv/bin/python'
HULL=R+'web/js/hull.js'; VES=R+'web/data/vessels.json'
fh=open(HULL).read(); fv=open(VES).read()
def run(tag):
    env=dict(os.environ,AUDIT_URL='http://localhost:8150')
    p=subprocess.run([PY,'/Users/augustgweon/Ships/Research/run_audit.py'],capture_output=True,text=True,env=env)
    open(R+f'proof-{tag}.out','w').write(p.stdout); open(R+f'proof-{tag}.err','w').write(p.stderr)
    probs=json.loads(p.stdout or '[]')
    line=f"{tag}: {p.stderr.strip().splitlines()[-1] if p.stderr.strip() else '?'}; " + '; '.join(sorted({f"{q.get('id')}: {q.get('what', q.get('problem'))}" for q in probs}))
    print(line,flush=True); open(R+'proofs.log','a').write(line+'\n')
old="    const h = S.funnelTopM !== undefined ? (S.funnelTopM - y) / (1 + 0.085 * 0.55) : hRec;"
assert fh.count(old)==1
try:
    open(HULL,'w').write(fh.replace(old,"    const h = hRec;")); run('OLDHEIGHT')
    open(HULL,'w').write(fh)
    d=json.loads(fv); h=[v for v in d['vessels'] if v['id']=='titanic'][0]['hull']; del h['funnelTopM']
    open(VES,'w').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n'); run('SILENCE')
    open(VES,'w').write(fv)
    open(HULL,'w').write(fh.replace(old,"    const h = S.funnelTopM !== undefined ? (S.funnelTopM - 0.5 - y) / (1 + 0.085 * 0.55) : hRec;")); run('HALFMETRE')
finally:
    open(HULL,'w').write(fh); open(VES,'w').write(fv)
run('FINAL')

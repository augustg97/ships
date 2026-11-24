# r298 proofs: each fault is written into the :8150 copy, the audit run, and the final tree restored.
import subprocess, os, json
R='/Users/augustgweon/Ships/build/staging/r298/'; PY='/Users/augustgweon/Modeling Studio/.venv/bin/python'
HULL=R+'web/js/hull.js'; VES=R+'web/data/vessels.json'
fh=open(HULL).read(); fv=open(VES).read()
def run(tag):
    env=dict(os.environ,AUDIT_URL='http://localhost:8150')
    p=subprocess.run([PY,'/Users/augustgweon/Ships/Research/run_audit.py'],capture_output=True,text=True,env=env)
    open(R+f'proof-{tag}.out','w').write(p.stdout); open(R+f'proof-{tag}.err','w').write(p.stderr)
    probs=json.loads(p.stdout or '[]')
    line=f"{tag}: {p.stderr.strip().splitlines()[-1] if p.stderr.strip() else '?'}; " + '; '.join(sorted({f"{q.get('id')}: {q.get('rule')}" for q in probs}))
    print(line,flush=True); open(R+'proofs.log','a').write(line+'\n')
def ves(edit):
    d=json.loads(fv); edit(d); open(VES,'w').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
tit=lambda d:[v for v in d['vessels'] if v['id']=='titanic'][0]['hull']['islands']['list']
old="        return isl.topM[0] + (isl.topM[1] - isl.topM[0]) * t;\n"
assert fh.count(old)==1
try:
    def oldtop(d):
        L=tit(d); L[0]['topM']=[13.86,13.45]; L[1]['topM']=[13.35,13.56]
    ves(oldtop); run('OLDTOP')
    def silence(d): del tit(d)[0]['topRead']
    ves(silence); run('SILENCE')
    open(VES,'w').write(fv)
    open(HULL,'w').write(fh.replace(old,"        return Math.max(isl.topM[0], isl.topM[1]);\n")); run('FLAT')
finally:
    open(HULL,'w').write(fh); open(VES,'w').write(fv)
run('FINAL')

# r301 proofs: each fault is written into the :8150 copy, the audit run, and the copy restored.
import subprocess, os, json
from collections import Counter
R='/Users/augustgweon/Ships/build/staging/r301/'; PY='/Users/augustgweon/Modeling Studio/.venv/bin/python'
SW=R+'w8150/web/js/shipwright.js'; VES=R+'w8150/web/data/vessels.json'
fs=open(SW).read(); fv=open(VES).read()
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
pred="""  return (H.masts || []).some(m => m.rig && m.rig !== 'none' && m.rig !== 'pole')
      || !!H.headsails;"""
assert fs.count(pred)==1
fixed="""  if (stage >= 4 && stage <= 6) {"""
assert fs.count(fixed)==1
try:
    open(SW,'w').write(fs.replace(pred,"  return !!(H.masts || []).length;")); run('OLDPRED')
    open(SW,'w').write(fs.replace(fixed,"  if (stage === 4) return ['Machinery in', 'The engine and shafting go in before the ship is closed up.'];\n"+fixed)); run('FIXEDTEXT')
    open(SW,'w').write(open(R+'shipwright.before.js').read()); run('OLDFILE')
    open(SW,'w').write(fs)
    def nomach(d): del tit(d)['machinery']; del tit(d)['machineryProvenance']
    ves(nomach); run('NOMACH')
    def noprov(d): del tit(d)['machineryProvenance']
    ves(noprov); run('NOPROV')
finally:
    open(SW,'w').write(fs); open(VES,'w').write(fv)
run('FINAL')

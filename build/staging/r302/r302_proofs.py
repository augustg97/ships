# r302 proofs: each fault is written into the :8150 copy, the audit run, and the copy restored.
import subprocess, os, json
from collections import Counter
R='/Users/augustgweon/Ships/build/staging/r302/'; PY='/Users/augustgweon/Modeling Studio/.venv/bin/python'
SW=R+'w8150/web/js/shipwright.js'
fs=open(SW).read()
def run(tag):
    env=dict(os.environ,AUDIT_URL='http://localhost:8150')
    p=subprocess.run([PY,'/Users/augustgweon/Ships/Research/run_audit.py'],capture_output=True,text=True,env=env)
    open(R+f'proof-{tag}.out','w').write(p.stdout); open(R+f'proof-{tag}.err','w').write(p.stderr)
    probs=json.loads(p.stdout or '[]')
    c=Counter(f"{q.get('id')}: {q.get('rule')}" for q in probs)
    line=f"{tag}: {p.stderr.strip().splitlines()[-1] if p.stderr.strip() else '?'}; " + '; '.join(f'{k} x{n}' for k,n in sorted(c.items()))
    print(line,flush=True); open(R+'proofs.log','a').write(line+'\n')
def sub(old,new):
    assert fs.count(old)==1, old[:60]; return fs.replace(old,new)
guns="""    const l = extras(joined ? ['crossbeam', 'platform'] : []);"""
pole="""    if (n) t += ' ' + clauses.join('; ') + '.';"""
keel="""  if (stage === 0) return swKeelCard(spec);"""
furl="""  if (rigs.has('square')) how.push("""
try:
    open(SW,'w').write(open(R+'shipwright.before.js').read()); run('OLDFILE')
    open(SW,'w').write(sub(guns, guns+"\n    t += ' It carries the guns.';")); run('GUNS')
    open(SW,'w').write(sub(pole, "    if (n) t += ' Each mast is a single pole.';")); run('POLE')
    open(SW,'w').write(sub(keel, "")); run('KEEL0')
    open(SW,'w').write(sub(furl, "  how.push('the square sails are rolled up on their yards');\n"+furl)); run('FURLSQUARE')
finally:
    open(SW,'w').write(fs)
run('FINAL')

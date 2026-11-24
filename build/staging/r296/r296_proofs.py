import json, subprocess, shutil
R='/Users/augustgweon/Ships/build/staging/r296/'; PY='/Users/augustgweon/Modeling Studio/.venv/bin/python'
A=json.load(open(R+'vessels.after.json',encoding='utf8'))
B=json.load(open(R+'vessels.before.json',encoding='utf8'))
tit=lambda d:next(x for x in d['vessels'] if x['id']=='titanic')['hull']
def run(name,fn,hull=None):
    d=json.loads(json.dumps(A)); fn(tit(d))
    open(R+'webold/data/vessels.json','w',encoding='utf8').write(json.dumps(d,ensure_ascii=False))
    h=open(R+'hull.after.js',encoding='utf8').read()
    if hull:
        assert h.count(hull[0])==1; h=h.replace(*hull)
    open(R+'webold/js/hull.js','w',encoding='utf8').write(h)
    with open(R+f'proof-{name}.out','w') as o, open(R+f'proof-{name}.err','w') as e:
        rc=subprocess.run([PY,R+'r296_audit_8150.py'],stdout=o,stderr=e,cwd=R).returncode
    try:
        p=json.load(open(R+f'proof-{name}.out')); rules=sorted({x['id']+': '+x['rule'] for x in p})
    except Exception as ex: p=[];rules=['UNREADABLE '+str(ex)]
    print(name,'rc',rc,'problems',len(p),rules,flush=True)
oldF=tit(B)['funnelAt']; oldM=[m['at'] for m in tit(B)['masts']]
def f(h): h['funnelAt']=oldF
def m(h):
    for x,a in zip(h['masts'],oldM): x['at']=a
def ny(h): h['masts'][0]['crowsNest']['yM']=44.9
def ns(h): h['masts'][0]['crowsNest']=True
def fs(h): del h['funnelRead']
run('FUNNEL',f); run('MAST',m); run('NESTHEIGHT',ny); run('NESTSILENCE',ns); run('FUNNELSILENCE',fs)
run('NESTOFF',lambda h:None,("const nx = mxA(CN.yM) - rMast + 0.04 - rN;","const nx = mxA(CN.yM) - rMast - 0.50 - rN;"))
run('FINAL',lambda h:None)

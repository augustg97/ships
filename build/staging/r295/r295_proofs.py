import json, subprocess, shutil, os, sys
R='/Users/augustgweon/Ships/build/staging/r295/'
PY='/Users/augustgweon/Modeling Studio/.venv/bin/python'
HJ,VJ=R+'web/js/hull.js',R+'web/data/vessels.json'
env=dict(os.environ,AUDIT_URL='http://localhost:8150')
def restore():
    shutil.copy(R+'hull.after.js',HJ); shutil.copy(R+'vessels.after.json',VJ)
def audit(tag):
    o=open(R+f'proof-{tag}.out','w'); e=open(R+f'proof-{tag}.err','w')
    subprocess.run([PY,R+'run_audit_8150.py'],stdout=o,stderr=e,env=env,cwd=R); o.close(); e.close()
    try: p=json.load(open(R+f'proof-{tag}.out'))
    except Exception as x: p=[{'rule':'AUDIT DID NOT RUN','detail':open(R+f'proof-{tag}.err').read()[-200:]}]
    print(tag,len(p),sorted({(x.get('id'),x['rule']) for x in p},key=str),flush=True)
def edit_js(a,b):
    s=open(R+'hull.after.js',encoding='utf8').read(); assert s.count(a)==1,a; open(HJ,'w',encoding='utf8').write(s.replace(a,b))
def edit_rec(f):
    d=json.load(open(R+'vessels.after.json',encoding='utf8')); h=next(x for x in d['vessels'] if x['id']=='titanic')['hull']; f(h)
    json.dump(d,open(VJ,'w',encoding='utf8'),ensure_ascii=False,indent=2)
try:
    edit_js("path.push({ u, x: xAt(u), z: halfAt(u) }); }\n    path.push({ u: u1, x: xAt(u1), z: -halfAt(u1) });","path.push({ u, x: xAt(u), z: halfAt(u) - 0.42 }); }\n    path.push({ u: u1, x: xAt(u1), z: -halfAt(u1) });"); audit('INSET'); restore()
    edit_js("      if (H.islandTop(u) !== null) return false;\n","") ; audit('CAPPING'); restore()
    edit_rec(lambda h:h.__setitem__('houseAt',[0.202,0.849])); audit('HOUSE'); restore()
    def br(h): h['islands']['list'][0]['u'][1]=0.1433; h['islands']['list'][1]['u'][0]=0.9077
    edit_rec(br); audit('BREAKS'); restore()
    def sil(h): del h['islands']['list'][1]['cols']
    edit_rec(sil); audit('SILENCE'); restore()
finally:
    restore()
print('restored', subprocess.run(['cmp',HJ,R+'hull.after.js']).returncode, subprocess.run(['cmp',VJ,R+'vessels.after.json']).returncode, flush=True)

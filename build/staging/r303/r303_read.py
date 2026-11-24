# r303: the two wells' bulwark tops at their ends, off trace.json, through r299's loft mapping
import numpy as np, json
T=json.load(open('trace.json'))
PX=3505.5/269.1
def WL(c): return 845-25*(c-123.5)/3505.5
d=json.load(open('/Users/augustgweon/Ships/web/data/vessels.json'))
hh=next(x for x in d['vessels'] if x['id']=='titanic')['hull']
L,loa=hh['lwl'],hh['loa']; rs=min(1,max(0,loa-L)/((hh['stemRake']+hh['sternRake'])*loa))
def rake(u):
    if u<hh['forefoot']: q=(hh['forefoot']-u)/hh['forefoot']; return -hh['stemRake']*rs*q*q*loa
    if u>1-hh['run']: q=(u-(1-hh['run']))/hh['run']; return hh['sternRake']*rs*q*q*loa
    return 0.0
x_of=lambda u:(u-.5)*L+rake(u); X0=x_of(0)
col_of_u=lambda u:3629-(x_of(u)-X0)*PX
isl={i['name']:i['u'] for i in hh['islands']['list']}
wells=[('Forward well','fore',[isl['Forecastle'][1],hh['houseAt'][0]],(2930,3090)),
       ('After well','aft',[hh['houseAt'][1],isl['Poop deck'][0]],(565,760))]
out=[]
for name,key,uu,(c0,c1) in wells:
    pts=np.array([p for p in T[key]['pts'] if c0<=p[0]<=c1],float)
    k=np.polyfit(pts[:,0],pts[:,1],1); res=pts[:,1]-np.polyval(k,pts[:,0]); rms=float(np.sqrt(np.mean(res**2)))
    cols=[round(col_of_u(u),1) for u in uu]; rows=[round(float(np.polyval(k,c)),1) for c in cols]
    wl=[round(WL(c),1) for c in cols]; top=[round((w-r)/PX,2) for w,r in zip(wl,rows)]
    print(name,'u',uu,'cols',cols,'rows',rows,'wl',wl,'top',top,'n',len(pts),'rms %.2f'%rms)
    out.append(dict(name=name,u=uu,topM=top,cols=cols,topRead=dict(rows=rows,datumRows=wl,datumM=0.0,pxPerM=round(PX,4),
        colRange=[int(pts[:,0].min()),int(pts[:,0].max())],rmsPx=round(rms,2),n=len(pts),read='build/staging/r303/r303_trace.py, r303_read.py')))
json.dump(out,open('wells.json','w'),indent=1)

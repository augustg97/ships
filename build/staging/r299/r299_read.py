# r299: Titanic's C deck (the shelter deck, her weather deck between the islands) traced off the
# 1911 side plan stem to stern, read over r297's tilted waterline, and mapped to the loft's u.
import numpy as np, json
from PIL import Image
a=np.asarray(Image.open('/Users/augustgweon/Ships/build/staging/r295/plates/side-plan-1911.png').convert('L')).astype(int)
dark=a<128
PX=3505.5/269.1
def WL(c): return 845-25*(c-123.5)/3505.5
def prof(c): return dark[:,c-20:c+20].mean(1)
# track the dashed C line from the stem (row 661 at col 3600) aft, every 10 columns
pts=[]; r=661.0
for c in range(3600,139,-10):
    p=prof(c); lo=int(round(r))-4; hi=int(round(r))+5
    seg=p[lo:hi]; i=int(np.argmax(seg))
    if seg[i]<0.3: continue
    # sub-row centroid of the peak
    w=p[lo+i-1:lo+i+2]; rr=lo+i+ (w[2]-w[0])/max(1e-6,w.sum())
    pts.append((c,rr)); r=rr
c=np.array([p[0] for p in pts],float); rr=np.array([p[1] for p in pts],float)
keep=np.ones(len(c),bool)
for _ in range(6):
    k=np.polyfit(c[keep],rr[keep],5); res=rr-np.polyval(k,c); s=max(0.5,1.5*np.std(res[keep])); keep=abs(res)<2.5*s
rms=float(np.sqrt(np.mean(res[keep]**2)))
print('tracked %d, kept %d, rms %.2f px, cols %d..%d'%(len(c),keep.sum(),rms,c[keep].min(),c[keep].max()))
h=lambda cc:(WL(cc)-np.polyval(k,cc))/PX
# the loft mapping (r295): column -> metres abaft the stem head -> x -> u
d=json.load(open('/Users/augustgweon/Ships/web/data/vessels.json'))
hh=next(x for x in d['vessels'] if x['id']=='titanic')['hull']
L,loa=hh['lwl'],hh['loa']; rs=min(1,max(0,loa-L)/((hh['stemRake']+hh['sternRake'])*loa))
def rake(u):
    if u<hh['forefoot']: q=(hh['forefoot']-u)/hh['forefoot']; return -hh['stemRake']*rs*q*q*loa
    if u>1-hh['run']: q=(u-(1-hh['run']))/hh['run']; return hh['sternRake']*rs*q*q*loa
    return 0.0
x_of=lambda u:(u-.5)*L+rake(u)
def u_of(x):
    a_,b_=0.0,1.0
    for _ in range(60):
        m=(a_+b_)/2
        if x_of(m)<x: a_=m
        else: b_=m
    return (a_+b_)/2
X0=x_of(0)
col_of_u=lambda u:3629-(x_of(u)-X0)*PX
# the stations: every 0.05 of u; the ends take the fit's end columns (the trace stops at 3600 and 140)
st=[]
for u in np.round(np.arange(0,1.0001,0.05),3):
    cc=col_of_u(u); ccl=min(max(cc,c[keep].min()),c[keep].max())
    st.append([float(u),round(float(h(ccl)),2),round(float(cc),1),bool(ccl!=cc)])
for s in st: print('  u %.2f  col %7.1f  C %.2f m%s'%(s[0],s[2],s[1],'  (fit end held)' if s[3] else ''))
print('u of col 3106.5 %.4f, of 556.5 %.4f (record 0.1354, 0.8858)'%(u_of(X0+(3629-3106.5)/PX),u_of(X0+(3629-556.5)/PX)))
json.dump(dict(coef=[float(x) for x in k],rmsPx=round(rms,2),n=int(keep.sum()),of=len(c),colRange=[int(c[keep].min()),int(c[keep].max())],
  stations=[[s[0],s[1]] for s in st],cols=[s[2] for s in st],trace=[[float(a_),round(float(b_),2)] for a_,b_ in zip(c,rr)]),open('read.json','w'),indent=0)
# the boat deck amidships, for the house's tier height
for cc in [1000,1200,1400,2000,2400]:
    p=dark[540:615,cc-20:cc+20].mean(1); pk=[540+i for i in range(1,len(p)-1) if p[i]>=0.6 and p[i]>=p[i-1] and p[i]>=p[i+1]]
    print('col',cc,'line rows 540-615:',pk,' -> m:',[round((WL(cc)-x)/PX,2) for x in pk])

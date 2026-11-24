# r309: re-trace Titanic's C deck off the 1911 side plan with a step limit. r299's trace let each
# point move 4 rows from the last; at column 790 it stepped 5 rows down onto a solid line under the
# dashed C line and followed that line to the stern.
import numpy as np, json
from PIL import Image
a=np.asarray(Image.open('/Users/augustgweon/Ships/build/staging/r295/plates/side-plan-1911.png').convert('L')).astype(int)
dark=a<128
PX=3505.5/269.1
def WL(c): return 845-25*(c-123.5)/3505.5
def prof(c): return dark[:,c-20:c+20].mean(1)
STEP=1.5   # rows per 10 columns: the deck's steepest slope on the plan is about 1 row per 10 columns at the stem
pts=[]; r=661.0; jumps=[]
for c in range(3600,139,-10):
    p=prof(c); lo=int(np.floor(r-STEP)); hi=int(np.ceil(r+STEP))+1
    seg=p[lo:hi]; i=int(np.argmax(seg))
    if seg[i]<0.3: continue
    w=p[lo+i-1:lo+i+2]; rr=lo+i+(w[2]-w[0])/max(1e-6,w.sum())
    if abs(rr-r)>STEP: jumps.append((c,r,rr)); continue
    pts.append((c,rr)); r=rr
old=json.load(open('../r299/read.json'))
oldt=dict((int(c),r) for c,r in old['trace'])
dev=[(c,rr,oldt.get(c)) for c,rr in pts if c in oldt and abs(rr-oldt[c])>1.0]
print('tracked %d points; rejected steps %d; differ from r299 by >1 row at %d columns: %s..%s'%(len(pts),len(jumps),len(dev),dev[0][0] if dev else '-',dev[-1][0] if dev else '-'))
c=np.array([p[0] for p in pts],float); rr=np.array([p[1] for p in pts],float)
keep=np.ones(len(c),bool)
for _ in range(6):
    k=np.polyfit(c[keep],rr[keep],5); res=rr-np.polyval(k,c); s=max(0.5,1.5*np.std(res[keep])); keep=abs(res)<2.5*s
rms=float(np.sqrt(np.mean(res[keep]**2)))
print('kept %d, rms %.2f px, max |res| %.2f px'%(keep.sum(),rms,abs(res[keep]).max()))
cols=old['cols']
def trace_at(cc):
    j=np.argmin(abs(c-cc)); return float(rr[j]) if abs(c[j]-cc)<=10 else None
out=[]
for (u,_),cc in zip(old['stations'],cols):
    ccl=min(max(cc,c[keep].min()),c[keep].max())
    fr=float(np.polyval(k,ccl)); tr=trace_at(cc)
    out.append(dict(u=u,col=cc,row=round(fr,2),datum=round(WL(ccl),2),m=round((WL(ccl)-fr)/PX,2),trace=None if tr is None else round(tr,2)))
ko=np.array(old['coef'])
for o in out:
    cc=min(max(o['col'],150),3600); om=(WL(cc)-np.polyval(ko,cc))/PX
    print('  u %.2f col %7.1f fit row %.2f trace %s  -> %.2f m (r299 %.2f, %+.2f)'%(o['u'],o['col'],o['row'],o['trace'],o['m'],om,o['m']-om))
# the r299 record's own fit against its own trace, at each station: the test the audit now makes
oldtr=np.array(old['trace'])
for (u,_),cc in zip(old['stations'],cols):
    j=np.argmin(abs(oldtr[:,0]-cc))
    if abs(oldtr[j,0]-cc)<=10:
        d_=oldtr[j,1]-np.polyval(ko,min(max(cc,150),3600))
        if abs(d_)>1.0: print('  r299 fit departs its own trace at u %.2f by %+.2f px'%(u,d_))
json.dump(dict(coef=[float(x) for x in k],rmsPx=round(rms,2),n=int(keep.sum()),of=len(c),colRange=[int(c[keep].min()),int(c[keep].max())],
  stations=out,trace=[[float(a_),round(float(b_),2)] for a_,b_ in zip(c,rr)],rejected=jumps),open('read.json','w'),indent=0)

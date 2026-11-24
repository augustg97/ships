# r297: Titanic's funnel heads off the 1911 side plan, over its tilted waterline and over its keel.
import numpy as np, json
from PIL import Image
a=np.asarray(Image.open('/Users/augustgweon/Ships/build/staging/r295/plates/side-plan-1911.png').convert('L')).astype(int)
dark=a<128
PX=3505.5/269.1
def WL(c): return 845-25*(c-123.5)/3505.5
cols=[2648.4,2177.2,1713.9,1254.4]
fit=json.load(open('/Users/augustgweon/Ships/build/staging/r296/fit.json'))
out=[]
for i,c in enumerate(cols):
    # the head's top edge: per column, the first dark row from row 240; keep the columns where it lies
    # within 30 rows of the window's highest point (the edge line itself, not guys or the pipe)
    T={}
    for cc in range(int(c)-110,int(c)+80):
        r=np.where(dark[240:330,cc])[0]
        if len(r): T[cc]=r[0]+240
    mn=min(T.values())
    edge={cc:r for cc,r in T.items() if r<=mn+22}
    # the edge is one straight line: fit it, keep the run of columns that lies on it
    cc=np.array(sorted(edge)); rr=np.array([edge[k] for k in cc])
    k,b=np.polyfit(cc,rr,1); keep=abs(rr-(k*cc+b))<1.5; k,b=np.polyfit(cc[keep],rr[keep],1)
    c0,c1=cc[keep].min(),cc[keep].max()
    # the stack's own axis (r296's fit of its two edges, rows 304-345) carried up to the head
    F=fit['F']['f%d'%(i+1)]; ax=lambda row: F['col']+F['slope']*(row-F['row'])
    mid=ax(k*c+b)
    for _ in range(4): top=k*mid+b; mid=ax(top)
    # keel: the lowest dark row under the head's centre column
    # the keel is one long horizontal line: the row in 940-1000 darkest over a 200-column run at the funnel
    band=dark[940:1000,int(mid)-100:int(mid)+100].sum(1); keel=int(band.argmax())+940
    o=dict(funnel=i+1,headCols=[int(c0),int(c1)],headMidCol=round(float(mid),1),topRow=round(float(top),1),
           wlRow=round(WL(mid),1),overWL=round((WL(mid)-top)/PX,2),keelRow=int(keel),overKeel=round((keel-top)/PX,2))
    out.append(o); print(o)
print('mean over WL %.2f, over keel %.2f'%(np.mean([o['overWL'] for o in out]),np.mean([o['overKeel'] for o in out])))
json.dump(out,open('read.json','w'),indent=1)

# r303: the wells' bulwark top (the plan's heavy solid line) traced across both wells
import numpy as np, json
from PIL import Image
a=np.asarray(Image.open('/Users/augustgweon/Ships/build/staging/r295/plates/side-plan-1911.png').convert('L')).astype(int)
dark=a<128
PX=3505.5/269.1
def WL(c): return 845-25*(c-123.5)/3505.5
out={}
for name,cols,r0 in [('fore',range(3100,2919,-3),671.5),('aft',range(565,761,3),692.5)]:
    pts=[]; r=r0
    for c in cols:
        p=dark[:,c-3:c+4].mean(1); lo=int(round(r))-4; seg=p[lo:lo+9]
        rows=[lo+i for i in range(9) if seg[i]>=0.6]
        if not rows: continue
        # the solid run containing the darkest row nearest r: its top, bottom and centre
        i0=min(rows,key=lambda x:abs(x-r)); t=i0; b=i0
        while p[t-1]>=0.6: t-=1
        while p[b+1]>=0.6: b+=1
        pts.append((c,t,b,(t+b)/2)); r=(t+b)/2
    c=np.array([q[0] for q in pts],float); m=np.array([q[3] for q in pts]); th=np.array([q[2]-q[1]+1 for q in pts])
    k=np.polyfit(c,m,1); res=m-np.polyval(k,c)
    h=(WL(c)-m)/PX; ht=(WL(c)-np.array([q[1] for q in pts]))/PX
    print(name,'n',len(c),'cols',int(c.min()),int(c.max()),'rms %.2f px'%np.sqrt(np.mean(res**2)),
          'thick px median',np.median(th),'max',th.max())
    for q,hh,htt in list(zip(pts,h,ht))[::6]: print('   col %d rows %d-%d  centre %.2f m  top %.2f m'%(q[0],q[1],q[2],hh,htt))
    out[name]=dict(coef=[float(x) for x in k],rmsPx=float(np.sqrt(np.mean(res**2))),n=len(c),colRange=[int(c.min()),int(c.max())],
        thickPx=float(np.median(th)),pts=[[int(q[0]),float(q[3])] for q in pts])
json.dump(out,open('trace.json','w'),indent=0)

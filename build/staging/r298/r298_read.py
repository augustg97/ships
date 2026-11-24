# r298: the forecastle and poop deck edges off the 1911 side plan, read as the solid bottom line of
# the open-rail band, column by column, in metres over the plan's tilted waterline (r297's WL).
import numpy as np, json
from PIL import Image
a=np.asarray(Image.open('/Users/augustgweon/Ships/build/staging/r295/plates/side-plan-1911.png').convert('L')).astype(int)
dark=a<128
PX=3505.5/269.1
def WL(c): return 845-25*(c-123.5)/3505.5
def bandBottom(c,lo,hi):
    f=dark[lo:hi,c-2:c+3].mean(1)>=0.6
    rows=np.where(f)[0]
    if not len(rows): return None
    cl=[[rows[0],rows[0]]]
    for r in rows[1:]:
        if r-cl[-1][1]<=4: cl[-1][1]=r
        else: cl.append([r,r])
    big=[x for x in cl if x[1]-x[0]>=12]
    if not big: return None
    return big[0][1]+lo
out={}
for name,cols,lo,hi in [('forecastle',range(3135,3616,4),595,665),('poop',range(128,545,4),640,690)]:
    pts=[(c,bandBottom(c,lo,hi)) for c in cols]; pts=[(c,r) for c,r in pts if r is not None]
    c=np.array([p[0] for p in pts],float); r=np.array([p[1] for p in pts],float)
    keep=np.ones(len(c),bool)
    for _ in range(5):
        k=np.polyfit(c[keep],r[keep],2); res=r-np.polyval(k,c); s=max(1.0,1.5*np.std(res[keep])); keep=abs(res)<2.5*s
    h=lambda cc:(WL(cc)-np.polyval(k,cc))/PX
    rms=float(np.sqrt(np.mean((r[keep]-np.polyval(k,c[keep]))**2)))
    out[name]=dict(n=int(keep.sum()),of=len(c),rmsPx=round(rms,2),coef=[float(x) for x in k],colRange=[int(c[keep].min()),int(c[keep].max())])
    print(name,'kept %d of %d, rms %.2f px'%(keep.sum(),len(c),rms))
    for cc in ([3629,3600,3500,3400,3300,3200,3125,3106.5] if name=='forecastle' else [123.5,150,250,350,450,540,556.5]):
        print('   col %7.1f  row %.1f  WL %.1f  -> %.2f m'%(cc,np.polyval(k,cc),WL(cc),h(cc)))
    out[name]['at']={str(cc):round(float(h(cc)),2) for cc in ([3629,3106.5] if name=='forecastle' else [556.5,123.5])}
json.dump(out,open('read.json','w'),indent=1)

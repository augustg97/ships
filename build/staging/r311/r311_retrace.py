# r311: re-run r298's island-top read and r303's well-top trace exactly, keep every per-column point,
# and test each for a jump to another line: neighbour step, and dark-pixel connectivity between neighbours.
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
def connected(c0,r0,c1,r1):
    # is there a dark path between (c0,r0) and (c1,r1) within a band of +-1.5 rows of the straight join?
    n=abs(c1-c0)
    for i in range(n+1):
        c=c0+(c1-c0)*i//n if n else c0; r=r0+(r1-r0)*i/max(n,1)
        if not dark[int(np.floor(r-1.5)):int(np.ceil(r+1.5))+1,c].any(): return False
    return True
out={}
# r298 islands
for name,cols,lo,hi in [('Forecastle',range(3135,3616,4),595,665),('Poop deck',range(128,545,4),640,690)]:
    pts=[(c,bandBottom(c,lo,hi)) for c in cols]
    raw=list(pts); pts=[(c,r) for c,r in pts if r is not None]
    c=np.array([p[0] for p in pts],float); r=np.array([p[1] for p in pts],float)
    keep=np.ones(len(c),bool)
    for _ in range(5):
        k=np.polyfit(c[keep],r[keep],2); res=r-np.polyval(k,c); s=max(1.0,1.5*np.std(res[keep])); keep=abs(res)<2.5*s
    steps=np.abs(np.diff(r)); ck=c[keep]; rk=r[keep]
    stepsK=np.abs(np.diff(rk))
    res=rk-np.polyval(k,ck)
    disc=[(int(ck[i]),int(rk[i]),int(ck[i+1]),int(rk[i+1])) for i in range(len(ck)-1) if not connected(int(ck[i]),rk[i],int(ck[i+1]),rk[i+1])]
    print(name,'cols',len(raw),'found',len(c),'kept',int(keep.sum()),'rejected',[(int(c[i]),int(r[i])) for i in range(len(c)) if not keep[i]],
          'none at',[cc for cc,rr in raw if rr is None])
    print('   max step all %.1f kept %.1f; max |res| %.2f; rms %.2f; disconnected joins %d %s'%(steps.max(),stepsK.max(),abs(res).max(),np.sqrt(np.mean(res**2)),len(disc),disc[:6]))
    out[name]=dict(src='r298',fromCol=int(cols[0]),stepCol=4,rows=[None if rr is None else int(rr) for cc,rr in raw],keep=[bool(x) for x in keep],
                   colsFound=[int(x) for x in c],fitCoef=[float(x) for x in k],maxStepKept=float(stepsK.max()),rms=float(np.sqrt(np.mean(res**2))),disc=disc)
# r303 wells
for name,cols,r0,(c0,c1) in [('Forward well',range(3100,2919,-3),671.5,(2930,3090)),('After well',range(565,761,3),692.5,(565,760))]:
    pts=[]; r=r0
    for cc in cols:
        p=dark[:,cc-3:cc+4].mean(1); lo=int(round(r))-4; seg=p[lo:lo+9]
        rows=[lo+i for i in range(9) if seg[i]>=0.6]
        if not rows: continue
        i0=min(rows,key=lambda x:abs(x-r)); t=i0; b=i0
        while p[t-1]>=0.6: t-=1
        while p[b+1]>=0.6: b+=1
        pts.append((cc,t,b,(t+b)/2)); r=(t+b)/2
    allc=[q[0] for q in pts]
    sel=[q for q in pts if c0<=q[0]<=c1]
    c=np.array([q[0] for q in sel],float); m=np.array([q[3] for q in sel])
    k=np.polyfit(c,m,1); res=m-np.polyval(k,c)
    steps=np.abs(np.diff(m)); stepsAll=np.abs(np.diff([q[3] for q in pts]))
    disc=[(int(c[i]),m[i],int(c[i+1]),m[i+1]) for i in range(len(c)-1) if not connected(int(c[i]),m[i],int(c[i+1]),m[i+1])]
    th=[q[2]-q[1]+1 for q in sel]
    print(name,'traced',len(pts),'used',len(sel),'missing cols',sorted(set(cols)-set(allc)))
    print('   max step used %.1f all %.1f; max |res| %.2f; rms %.2f; thick %s..%s; disconnected joins %d %s'%(steps.max(),stepsAll.max(),abs(res).max(),np.sqrt(np.mean(res**2)),min(th),max(th),len(disc),disc[:6]))
    out[name]=dict(src='r303',pts=[[int(q[0]),float(q[1]),float(q[2]),float(q[3])] for q in pts],used=[c0,c1],fitCoef=[float(x) for x in k],
                   maxStepUsed=float(steps.max()),rms=float(np.sqrt(np.mean(res**2))),disc=disc)
json.dump(out,open('retrace.json','w'),indent=0)

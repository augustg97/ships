import numpy as np, json
from PIL import Image
a=np.asarray(Image.open('/Users/augustgweon/Ships/build/staging/r295/plates/side-plan-1911.png').convert('L')).astype(int)
dark=a<128
PX=3505.5/269.1; HEAD=3629.0
def WL(c): return 845-25*(c-123.5)/3505.5
xHead=-134.56 # refined from the page below
def runs(m,off=0):
    o=[];s=None
    for i,v in enumerate(m):
        if v and s is None:s=i
        if not v and s is not None:o.append((s+off,i-1+off));s=None
    if s is not None:o.append((s+off,len(m)-1+off))
    return o
print('px/m',PX)
print('--- funnels (rows 304..345, the clean head box)')
F={}
for name,c0,c1 in (('f1',2530,2680),('f2',2060,2210),('f3',1600,1745),('f4',1140,1290)):
    R=[];Lf=[];Rf=[]
    for r in range(304,346):
        rr=runs(dark[r,c0:c1],c0)
        if len(rr)<2: continue
        g=max((rr[i+1][0]-rr[i][1],rr[i][1],rr[i+1][0]) for i in range(len(rr)-1))
        if g[0]<70: continue
        R.append(r);Lf.append(g[1]+.5);Rf.append(g[2]-.5)
    R=np.array(R);mid=(np.array(Lf)+np.array(Rf))/2
    k,b=np.polyfit(R,mid,1); rms=(mid-(k*R+b)).std()
    # the row of the model's funnel root height 19.0 m over the WL
    c=k*580+b
    for _ in range(3):
        row=WL(c)-19.0*PX; c=k*row+b
    F[name]=dict(col=round(float(c),1),row=round(float(row),1),slope=round(float(k),4),rms=round(float(rms),2),w=round(float(np.mean(np.array(Rf)-np.array(Lf))),1))
    print(name,F[name],'deg %.2f'%np.degrees(np.arctan(k)))
print('--- masts: two edges of each pole')
M={}
for name,(p1,s1,p2,s2) in {'fore':((3126.7,420),.195,(3118.3,420),.179),'main':((760.7,420),.185,(753.3,420),.168)}.items():
    E=[]
    for (c0,r0),s in ((p1,s1),(p2,s2)):
        Rr=[];C=[]
        for r in range(430,600,2):
            pred=c0+s*(r-r0)
            rr=runs(dark[r,int(pred)-6:int(pred)+7],int(pred)-6)
            if not rr: continue
            cc=[(x+y)/2 for x,y in rr]; best=min(cc,key=lambda q:abs(q-pred))
            if abs(best-pred)<3.5: Rr.append(r);C.append(best)
        Rr=np.array(Rr);C=np.array(C)
        k,b=np.polyfit(Rr,C,1)
        keep=abs(C-(k*Rr+b))<1.2
        k,b=np.polyfit(Rr[keep],C[keep],1)
        E.append((k,b,int(keep.sum()),float((C[keep]-(k*Rr[keep]+b)).std())))
    kc=(E[0][0]+E[1][0])/2; bc=(E[0][1]+E[1][1])/2
    M[name]=dict(k=round(kc,4),deg=round(float(np.degrees(np.arctan(kc))),2),edges=[(round(e[0],4),e[2],round(e[3],2)) for e in E],wAt600=round((E[0][0]*600+E[0][1])-(E[1][0]*600+E[1][1]),1))
    for yM in (10.3,13.5):
        c=kc*600+bc
        for _ in range(3):
            row=WL(c)-yM*PX; c=kc*row+bc
        M[name][f'col@y{yM}']=round(float(c),1); M[name][f'row@y{yM}']=round(float(row),1)
    print(name,M[name])
json.dump({'F':F,'M':M,'PX':PX},open('fit.json','w'),indent=1)
# trucks: the topmost dark pixel near each mast
for name,(c0,c1) in {'fore':(3030,3075),'main':(670,710)}.items():
    ys,xs=np.where(dark[5:80,c0:c1]); i=ys.argmin(); c=xs[i]+c0; r=ys[i]+5
    print(name,'truck col',c,'row',r,'over WL %.1f m'%((WL(c)-r)/PX))

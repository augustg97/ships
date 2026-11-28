import sys, numpy as np
from PIL import Image
B='/Users/augustgweon/Ships/Research/baselines/frames/'
def clusters(n, run='run1', save=True):
    a=Image.open(B+n+'.png').convert('RGB'); b=Image.open(f'{run}/{n}.png').convert('RGB')
    d=np.abs(np.asarray(a).astype(int)-np.asarray(b).astype(int)).sum(2)>24
    nz=np.nonzero(d.sum(0))[0]
    if not len(nz): print(n,'no px'); return
    g=[[nz[0],nz[0]]]
    for c in nz[1:]:
        if c-g[-1][1]>30: g.append([c,c])
        else: g[-1][1]=c
    out=[]
    for s,e in g:
        ys=np.nonzero(d[:,s:e+1].sum(1))[0]; out.append((int(s),int(e),int(ys.min()),int(ys.max()),int(d[:,s:e+1].sum())))
    print(n, out)
    if save:
        tiles=[]
        for s,e,y0,y1,_ in out:
            box=(max(0,s-60),max(0,y0-60),min(2880,e+60),min(1800,y1+60))
            tiles.append((a.crop(box),b.crop(box)))
        W=sum(t[0].size[0] for t in tiles)+10*len(tiles); H=max(t[0].size[1] for t in tiles)
        o=Image.new('RGB',(W,H*2+8),'white'); x=0
        for p,q in tiles: o.paste(p,(x,0)); o.paste(q,(x,H+8)); x+=p.size[0]+10
        o.save(f'wit/mv-{n}.png')
for n in sys.argv[1:]: clusters(n)

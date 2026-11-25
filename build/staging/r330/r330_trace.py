import sys
from PIL import Image
import numpy as np
im=np.asarray(Image.open('../r328/dl/hollar-flute.jpg').convert('L')).astype(float)
def trace(x0,y0,x1,y1,w=6,step=4):
    out=[]
    for c in range(x0,x1+1,step):
        g=y0+(y1-y0)*(c-x0)/(x1-x0)
        rs=np.arange(int(g)-w,int(g)+w+1)
        col=im[rs,c-1:c+2].mean(axis=1)
        d=255-col; d=np.clip(d-np.percentile(d,30),0,None)
        cy=(rs*d).sum()/max(d.sum(),1e-9)
        out.append((c,round(cy,1),int(col.min())))
    return out
for name,args in [('fore',(660,612,775,591)),('main',(1065,602,1205,561))]:
    t=trace(*args)
    print(name, t)
    xs=np.array([a for a,b,m in t]); ys=np.array([b for a,b,m in t])
    p=np.polyfit(xs,ys,1); r=ys-np.polyval(p,xs)
    print(' fit slope %.4f icpt %.2f rms %.2f max %.2f'%(p[0],p[1],r.std(),abs(r).max()))

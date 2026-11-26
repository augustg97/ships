# Fit Hollar's fluyt lateen yard: per row, darkest run near the predicted line.
import numpy as np, json
from PIL import Image
im=np.asarray(Image.open('../r328/dl/hollar-flute.jpg').convert('L')).astype(float)
H=(1407,880); P=(1657,486)
pts=[]
for r in range(500,870,3):
    t=(r-H[1])/(P[1]-H[1]); c0=H[0]+t*(P[0]-H[0])
    cols=np.arange(int(c0)-8,int(c0)+9); v=im[r,cols]
    if v.min()>110: continue
    w=np.clip(130-v,0,None); 
    if w.sum()==0: continue
    pts.append((r,(cols*w).sum()/w.sum(),v.min()))
pts=np.array(pts)
A=np.vstack([pts[:,0],np.ones(len(pts))]).T
(s,i),res,_,_=np.linalg.lstsq(A,pts[:,1],rcond=None)
pred=A@[s,i]; rms=np.sqrt(((pred-pts[:,1])**2).mean())
print('n',len(pts),'col = %.4f*row + %.2f'%(s,i),'rms %.2f'%rms)
for r,c,m in pts[::8]: print(int(r),round(c,1),int(m),round(c-(s*r+i),2))
ang=np.degrees(np.arctan(1/abs(s)))
print('angle from horizontal %.2f'%ang)
json.dump({'slope':s,'icpt':i,'rms':rms,'n':len(pts),'angle':ang},open('yardfit.json','w'))

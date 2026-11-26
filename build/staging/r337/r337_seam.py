"""r337 (0y180): trace the fluyt's wale seams on Hollar's 1647 plate by a slope-limited darkest path (DP),
from a start row in the waist, every 2 columns, median of 7 columns; a row change costs 3 grey levels."""
from PIL import Image, ImageDraw; import numpy as np, json, sys
src=Image.open('../r328/dl/hollar-flute.jpg').convert('L'); im=np.asarray(src).astype(float)
c0,c1,step=900,1690,2
cols=list(range(c0,c1+1,step)); R0,R1=860,1010
cost=np.array([np.median(im[R0:R1,c-3:c+4],axis=1) for c in cols])
def dp(s, band=None):
    n,m=cost.shape; INF=1e18; D=np.full((n,m),INF); P=np.zeros((n,m),int); D[0,s-R0]=cost[0,s-R0]
    for i in range(1,n):
        prev=D[i-1]
        cand=np.stack([np.r_[INF,prev[:-1]]+3, prev, np.r_[prev[1:],INF]+3])
        k=cand.argmin(0); D[i]=cand.min(0)+cost[i]; P[i]=np.arange(m)+k-1
        if band is not None:
            lo,hi=band(cols[i]); mask=np.ones(m,bool); mask[max(0,lo-R0):hi-R0+1]=False; D[i][mask]=INF
    j=int(D[-1].argmin()); path=[j]
    for i in range(n-1,0,-1): j=int(P[i,j]); path.append(j)
    return [int(p+R0) for p in path[::-1]]
out={}
for s in [946,967,991]:
    out[s]=dp(s)
json.dump({'cols':cols,'paths':{str(k):v for k,v in out.items()}},open('seam-dp.json','w'))
for s,p in out.items(): print(s,[(cols[i],p[i]) for i in range(0,len(p),25)])
rgb=src.convert('RGB'); d=ImageDraw.Draw(rgb)
for s,cl in zip(out,[(0,160,255),(255,0,0),(0,200,0)]):
    p=out[s]; d.line(list(zip(cols,p)),fill=cl,width=1)
rgb.crop((1150,860,1700,1010)).resize((1650,450),Image.LANCZOS).save('crops/seam-aft.png')
rgb.crop((880,880,1200,1010)).resize((960,390),Image.LANCZOS).save('crops/seam-fwd.png')

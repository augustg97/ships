"""r337: the seam at row 967 (waist), traced the whole length: forward from column 900 to 746 and aft to 1690,
slope-limited darkest path, every 2 columns, median of 7 columns, 3 grey levels a row change."""
from PIL import Image, ImageDraw; import numpy as np, json
src=Image.open('../r328/dl/hollar-flute.jpg').convert('L'); im=np.asarray(src).astype(float)
R0,R1=860,1010
def dp(cols, s):
    cost=np.array([np.median(im[R0:R1,c-3:c+4],axis=1) for c in cols]); n,m=cost.shape; INF=1e18
    D=np.full((n,m),INF); P=np.zeros((n,m),int); D[0,s-R0]=cost[0,s-R0]
    for i in range(1,n):
        prev=D[i-1]; cand=np.stack([np.r_[INF,prev[:-1]]+3, prev, np.r_[prev[1:],INF]+3])
        k=cand.argmin(0); D[i]=cand.min(0)+cost[i]; P[i]=np.arange(m)+k-1
    j=int(D[-1].argmin()); path=[j]
    for i in range(n-1,0,-1): j=int(P[i,j]); path.append(j)
    return [int(p+R0) for p in path[::-1]], cost
aft=list(range(900,1691,2)); fwd=list(range(900,745,-2))
pa,ca=dp(aft,967); pf,cf=dp(fwd,967)
cols=fwd[::-1][:-1]+aft; rows=pf[::-1][:-1]+pa
steps=np.abs(np.diff(rows)); print('points',len(rows),'max step',steps.max())
print([(c,r) for c,r in zip(cols,rows)][::10])
json.dump({'fromCol':cols[0],'stepCol':2,'rows':rows,'startRow':967,'startCol':900},open('seam-trace.json','w'))
rgb=src.convert('RGB'); d=ImageDraw.Draw(rgb); d.line(list(zip(cols,rows)),fill=(255,0,0),width=1)
rgb.crop((700,860,1200,1010)).resize((1500,450),Image.LANCZOS).save('crops/seam-bow.png')
rgb.crop((700,760,1760,1010)).resize((2120,500),Image.LANCZOS).save('crops/seam-whole.png')

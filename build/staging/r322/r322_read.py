# r322: read every mast's foot, top, topmast head and truck on Hocker's Vasa rig diagram (bow at the right)
from PIL import Image
import numpy as np, json, sys
im=np.asarray(Image.open('../r320/dl/vasa-rig.jpg').convert('RGB')).astype(int)
R,G,B=im[...,0],im[...,1],im[...,2]
brown=(R<215)&(R>120)&(G<175)&(B<130)&(R-B>55)
grey=(abs(R-G)<14)&(abs(G-B)<14)&(R<140)
H,W=brown.shape
def runs(cols):
    out=[]
    if not cols: return out
    s=p=cols[0]
    for c in cols[1:]:
        if c!=p+1: out.append((s,p)); s=c
        p=c
    out.append((s,p)); return out
res={}
for name,(x0,y0) in {'fore':(1154,990),'main':(650,1000),'mizzen':(322,940)}.items():
    # walk up the mast from its foot, following the run nearest the last centre
    cx=x0; prof=[]
    for y in range(y0,10,-1):
        rs=runs([x for x in range(int(cx)-40,int(cx)+41) if 0<=x<W and brown[y,x]])
        if not rs: prof.append((y,None,0)); continue
        r=min(rs,key=lambda r:abs((r[0]+r[1])/2-cx))
        c=(r[0]+r[1])/2; w=r[1]-r[0]+1
        if abs(c-cx)<8 and w<=14: cx=c
        prof.append((y,c if abs(c-cx)<25 else None,w))
    pts=np.array([(y,c) for y,c,w in prof if c is not None and w<=14])
    a,b=np.polyfit(pts[:,0],pts[:,1],1)   # x = a*y + b
    # truck: topmost row with brown within 3 px of the axis, after which 15 rows have none
    on=[y for y,c,w in prof if c is not None and abs(c-(a*y+b))<4]
    truck=min(on)
    # foot: the hull's upper edge under the axis -- first grey row going down from the sail's foot
    foot=None
    for y in range(y0-120,H):
        x=int(round(a*y+b))
        if grey[y,max(0,x-12):x+13].sum()>=12: foot=y; break
    # wide brown runs across the axis (tops, yards): rows where the run containing the axis is >= 22 px wide
    wide=[]
    for y in range(truck,foot or y0):
        x=int(round(a*y+b))
        rs=runs([xx for xx in range(x-80,x+81) if brown[y,xx]])
        hit=[r for r in rs if r[0]<=x<=r[1]]
        if hit and hit[0][1]-hit[0][0]+1>=22: wide.append((y,hit[0][1]-hit[0][0]+1,hit[0][0],hit[0][1]))
    res[name]={'axis':[a,b],'rakeDeg':float(np.degrees(np.arctan(a))),'truck':truck,'foot':foot,'footX':a*(foot or 0)+b,'wide':wide}
    print(name,'axis x=%.4f*y+%.1f rake %.2f deg'%(a,b,np.degrees(np.arctan(a))),'truck',truck,'foot',foot,'footX %.1f'%(a*(foot or 0)+b))
    # group wide rows into bands
    bands=[];
    for y,w,l,r in wide:
        if bands and y-bands[-1][-1][0]<=2: bands[-1].append((y,w,l,r))
        else: bands.append([(y,w,l,r)])
    for bd in bands: print('   band rows %d-%d maxw %d cols %d-%d'%(bd[0][0],bd[-1][0],max(t[1] for t in bd),min(t[2] for t in bd),max(t[3] for t in bd)))
    res[name]['bands']=[[bd[0][0],bd[-1][0],max(t[1] for t in bd),min(t[2] for t in bd),max(t[3] for t in bd)] for bd in bands]
# hull: upper edge from the taffrail to the stem head
top=[]
for x in range(0,W,4):
    ys=[y for y in range(600,H) if grey[y,x]]
    if ys: top.append((x,min(ys)))
print('hull grey columns',top[0],top[-1])
json.dump(res,open('mast-read.json','w'),indent=1)

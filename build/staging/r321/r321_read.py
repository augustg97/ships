# read the mizzen lateen yard on Hocker's Vasa rig diagram (bow at the right)
from PIL import Image
import numpy as np, json
im=np.asarray(Image.open('../r320/dl/vasa-rig.jpg').convert('RGB')).astype(int)
R,G,B=im[...,0],im[...,1],im[...,2]
brown=(R<215)&(R>120)&(G<175)&(B<130)&(R-B>55)
# rough line through (112,597)-(499,949)
x0,y0,x1,y1=112,597,499,949
m=(y1-y0)/(x1-x0)
pts=[]
for x in range(100,515):
    yp=y0+m*(x-x0)
    rows=[y for y in range(int(yp)-12,int(yp)+13) if 0<=y<im.shape[0] and brown[y,x]]
    if rows:
        # take the run nearest the predicted row
        runs=[];s=rows[0];p=rows[0]
        for y in rows[1:]:
            if y!=p+1: runs.append((s,p)); s=y
            p=y
        runs.append((s,p))
        best=min(runs,key=lambda r:abs((r[0]+r[1])/2-yp))
        pts.append((x,(best[0]+best[1])/2,best[1]-best[0]+1))
xs=np.array([p[0] for p in pts]);ys=np.array([p[1] for p in pts])
# mask out the mast crossing (x 285..315) where the run is the mast's
keep=(xs<280)|(xs>320)
a,b=np.polyfit(xs[keep],ys[keep],1)
res=ys[keep]-(a*xs[keep]+b)
print('columns with yard pixels',len(xs),'x range',xs.min(),xs.max())
print('fit slope',a,'deg',np.degrees(np.arctan(a)),'rms resid',res.std(),'max',abs(res).max())
# ends: first/last column where the run stays on the line
on=[p for p in pts if abs(p[1]-(a*p[0]+b))<3]
print('aft end',on[0],'fore end',on[-1])
print('widths', [p[2] for p in on[::25]])
# mizzen mast axis: brown column runs between rows 710 and 940 excluding the yard crossings
mx=[]
for y in list(range(800,935,5))+list(range(712,760,4)):
    cols=[x for x in range(260,345) if brown[y,x]]
    if cols:
        runs=[];s=cols[0];p=cols[0]
        for x in cols[1:]:
            if x!=p+1: runs.append((s,p)); s=x
            p=x
        runs.append((s,p))
        # mast run: width 5..14, nearest to the expected axis
        exp=324-(944-y)*0.10
        r=min(runs,key=lambda r:abs((r[0]+r[1])/2-exp))
        mx.append((y,(r[0]+r[1])/2,r[1]-r[0]+1))
my=np.array([p[0] for p in mx]);mxx=np.array([p[1] for p in mx])
c,d=np.polyfit(my,mxx,1)
print('mast x = %.4f*y + %.1f ; rake deg %.2f'%(c,d,np.degrees(np.arctan(-c))))
print('mast samples',mx[:4],mx[-4:])
# crossing: solve y = a x + b and x = c y + d
yc=(a*d+b)/(1-a*c); xc=c*yc+d
print('yard crosses mast axis at x %.1f row %.1f'%(xc,yc))
ax,ay=on[0][0],on[0][1]; fx,fy=on[-1][0],on[-1][1]
L=np.hypot(fx-ax,fy-ay)
s=np.hypot(fx-xc,fy-yc)
print('yard length px %.1f ; heel->sling %.1f = %.3f of the yard'%(L,s,s/L))
foot=(c*944+d,944); top=(c*700+d,700)
mastlen=np.hypot(foot[0]-top[0],244)
print('mast foot',foot,'top',top,'deck-to-top along axis %.1f'%mastlen)
print('yard / deck-to-top (vertical 244) %.3f ; along axis %.3f'%(L/244,L/mastlen))
print('sling over the foot row: %.1f px = %.3f of deck-to-top'%(944-yc,(944-yc)/244))
print('heel row %.1f vs mast foot row 944: %.1f px; heel x %.1f is %.1f px before the mast foot'%(fy,944-fy,fx,fx-foot[0]))
print('peak x %.1f row %.1f'%(ax,ay))
json.dump({'fit':[a,b],'mast':[c,d],'aft':on[0],'fore':on[-1],'cross':[xc,yc],'pts':pts},open('lateen-read.json','w'))

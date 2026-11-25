import sys, json
from PIL import Image, ImageDraw
import numpy as np
P='../r328/dl/hollar-flute.jpg'
im=np.asarray(Image.open(P).convert('L')).astype(float)
def trace(x0,y0,x1,y1,w=5,step=3):
    out=[]
    for c in range(x0,x1+1,step):
        g=y0+(y1-y0)*(c-x0)/(x1-x0)
        rs=np.arange(int(round(g))-w,int(round(g))+w+1)
        col=im[rs,c-1:c+2].mean(axis=1)
        d=255-col; d=np.clip(d-np.percentile(d,30),0,None)
        cy=(rs*d).sum()/max(d.sum(),1e-9)
        out.append((c,round(cy,1),int(col.min())))
    return out
res={}
# guide lines (col,row) -> (col,row); axis = foot -> cap from mastHeightsRead
for name,g,foot,cap in [('fore',(674,351,736,318),(724,902),(693,285)),('main',(1128,287,1208,255),(1143,933),(1176,192))]:
    t=trace(*g)
    xs=np.array([a for a,b,m in t]); ys=np.array([b for a,b,m in t])
    p=np.polyfit(xs,ys,1); r=ys-np.polyval(p,xs)
    # crossing with axis: col = foot_c + (cap_c-foot_c)*(foot_r-row)/(foot_r-cap_r)
    row=300.0
    for _ in range(50):
        c=foot[0]+(cap[0]-foot[0])*(foot[1]-row)/(foot[1]-cap[1]); row=np.polyval(p,c)
    share=(foot[1]-row)/(foot[1]-cap[1])
    res[name]=dict(points=t,slope=round(p[0],4),icpt=round(p[1],2),rms=round(float(r.std()),2),maxres=round(float(abs(r).max()),2),n=len(t),axisCol=round(float(c),1),row=round(float(row),1),share=round(float(share),4))
    print(name,{k:v for k,v in res[name].items() if k!='points'})
json.dump(res,open('trace.json','w'),indent=1)
img=Image.open(P).convert('RGB'); d=ImageDraw.Draw(img)
for name,(foot,cap) in {'fore':((724,902),(693,285)),'main':((1143,933),(1176,192))}.items():
    R=res[name]; d.line([foot,cap],fill=(0,160,255))
    for c,y,m in R['points']: d.point((c,y),fill=(255,0,0))
    xs=[R['points'][0][0]-10,R['points'][-1][0]+10]; d.line([(x,R['slope']*x+R['icpt']) for x in xs],fill=(255,0,0))
for name,box in [('fore',(640,270,770,380)),('main',(1100,180,1230,310))]:
    c=img.crop(box); c.resize((c.width*5,c.height*5),Image.NEAREST).save(f'fit-{name}.png')

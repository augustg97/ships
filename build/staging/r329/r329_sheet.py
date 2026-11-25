import sys
from PIL import Image, ImageDraw
im=Image.open('../r328/dl/hollar-flute.jpg').convert('RGB')
def crop(x0,y0,x1,y1,sc,step=5):
    c=im.crop((x0,y0,x1,y1)).resize(((x1-x0)*sc,(y1-y0)*sc),Image.LANCZOS)
    d=ImageDraw.Draw(c)
    for y in range(((y0+step-1)//step)*step,y1,step):
        Y=(y-y0)*sc; L=20 if y%10==0 else 8
        d.line([(0,Y),(L,Y)],fill=(255,0,0),width=2)
        if y%10==0: d.text((22,Y-5),str(y),fill=(255,0,0))
    for x in range(((x0+step-1)//step)*step,x1,step):
        X=(x-x0)*sc; L=20 if x%10==0 else 8
        d.line([(X,c.height-L),(X,c.height)],fill=(0,0,255),width=2)
        if x%20==0: d.text((X+2,c.height-34),str(x),fill=(0,0,255))
    return c
specs=eval(sys.argv[2])
cs=[crop(*s) for s in specs]
W=sum(c.width for c in cs)+10*len(cs); H=max(c.height for c in cs)
S=Image.new('RGB',(W,H),'white'); x=0
for c in cs: S.paste(c,(x,0)); x+=c.width+10
S.save(sys.argv[1])

import sys
from PIL import Image, ImageDraw
im=Image.open('../r328/dl/hollar-flute.jpg').convert('RGB')
x0,y0,x1,y1,sc,out=[*map(int,sys.argv[1:6]),sys.argv[6]]
c=im.crop((x0,y0,x1,y1)).resize(((x1-x0)*sc,(y1-y0)*sc),Image.LANCZOS)
d=ImageDraw.Draw(c)
step=int(sys.argv[7]) if len(sys.argv)>7 else 10
for y in range((y0//step)*step,y1,step):
    if y<y0: continue
    Y=(y-y0)*sc; L=14 if y%50==0 else 6
    d.line([(0,Y),(L,Y)],fill=(255,0,0)); 
    if y%50==0: d.text((16,Y-5),str(y),fill=(255,0,0))
for x in range((x0//step)*step,x1,step):
    if x<x0: continue
    X=(x-x0)*sc; L=14 if x%50==0 else 6
    d.line([(X,0),(X,L)],fill=(0,0,255))
    if x%50==0: d.text((X+2,16),str(x),fill=(0,0,255))
c.save(out)

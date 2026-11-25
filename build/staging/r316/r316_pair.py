import sys
from PIL import Image, ImageChops
n, src = sys.argv[1], sys.argv[2]
a=Image.open(f'/Users/augustgweon/Ships/Research/baselines/frames/{n}.png').convert('RGB'); b=Image.open(f'{src}/{n}.png').convert('RGB')
d=ImageChops.difference(a,b).convert('L').point(lambda v:255 if v>8 else 0); bb=d.getbbox(); print(n, bb)
x0,y0,x1,y1=bb; pad=80; box=(max(0,x0-pad),max(0,y0-pad),min(a.size[0],x1+pad),min(a.size[1],y1+pad))
A=a.crop(box);B=b.crop(box);w,h=A.size;p=Image.new('RGB',(w*2+10,h),'white');p.paste(A,(0,0));p.paste(B,(w+10,0))
s=min(1.0, 1800/p.size[0]); p.resize((int(p.size[0]*s),int(p.size[1]*s))).save(f'pair-{n}.png')

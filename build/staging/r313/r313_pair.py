import sys
from PIL import Image, ImageChops
import numpy as np
src = sys.argv[1]
for n in sys.argv[2:]:
    a=Image.open(f'/Users/augustgweon/Ships/Research/baselines/frames/{n}.png').convert('RGB'); b=Image.open(f'{src}/{n}.png').convert('RGB')
    d=np.asarray(ImageChops.difference(a,b)).sum(2)>30; ys,xs=np.nonzero(d)
    print(n, a.size, d.sum(), xs.min(),xs.max(),ys.min(),ys.max())
    x0,x1,y0,y1=max(0,xs.min()-40),min(a.width,xs.max()+40),max(0,ys.min()-40),min(a.height,ys.max()+40)
    ca=a.crop((x0,y0,x1,y1)); cb=b.crop((x0,y0,x1,y1)); w,h=ca.size
    pair=Image.new('RGB',(w*2+10,h),'white'); pair.paste(ca,(0,0)); pair.paste(cb,(w+10,0))
    s=min(1.0, 1800/pair.width, 1000/pair.height); pair=pair.resize((int(pair.width*s),int(pair.height*s))); pair.save(f'pair-{n}.png'); print(pair.size)

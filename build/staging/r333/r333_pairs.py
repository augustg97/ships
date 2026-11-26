import sys, numpy as np
from PIL import Image, ImageChops
B='/Users/augustgweon/Ships/Research/baselines/frames/'
d, names = sys.argv[1], sys.argv[2:]
for n in names:
    a=Image.open(B+n+'.png').convert('RGB'); b=Image.open(f'{d}/{n}.png').convert('RGB')
    df=np.asarray(ImageChops.difference(a,b)).max(2); ys,xs=np.nonzero(df>12)
    if not len(xs): print(n,'no px >12'); continue
    box=(max(0,xs.min()-40),max(0,ys.min()-40),min(a.width,xs.max()+40),min(a.height,ys.max()+40))
    print(n,'bbox',(xs.min(),ys.min(),xs.max(),ys.max()))
    ca,cb=a.crop(box),b.crop(box); w,h=ca.size; p=Image.new('RGB',(w,h*2+6),'red'); p.paste(ca,(0,0)); p.paste(cb,(0,h+6))
    s=min(1,1400/max(p.size)); p.resize((int(p.width*s),int(p.height*s))).save(f'pair-{n}.png')

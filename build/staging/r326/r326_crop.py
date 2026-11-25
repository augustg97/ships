import sys
from PIL import Image, ImageChops
d, names = sys.argv[1], sys.argv[2:]
for n in names:
    a=Image.open(f'/Users/augustgweon/Ships/Research/baselines/frames/{n}.png').convert('RGB'); b=Image.open(f'{d}/{n}.png').convert('RGB')
    m=ImageChops.difference(a,b).convert('L').point(lambda v:255 if v>12 else 0); bb=m.getbbox()
    x0,y0,x1,y1=bb; pad=60; x0=max(0,x0-pad); y0=max(0,y0-pad); x1=min(a.width,x1+pad); y1=min(a.height,y1+pad)
    ca=a.crop((x0,y0,x1,y1)); cb=b.crop((x0,y0,x1,y1))
    s=min(1.0, 900/ca.width, 700/ca.height)
    ca=ca.resize((int(ca.width*s),int(ca.height*s))); cb=cb.resize(ca.size)
    p=Image.new('RGB',(ca.width*2+10,ca.height),'white'); p.paste(ca,(0,0)); p.paste(cb,(ca.width+10,0)); p.save(f'pair-{n}.png'); print(n,bb)

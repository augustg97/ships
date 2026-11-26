import sys
from PIL import Image, ImageChops
B='/Users/augustgweon/Ships/Research/baselines/frames/'; C='/Users/augustgweon/Ships/Research/baselines/_current/'
for n in sys.argv[1:]:
    b=Image.open(B+n+'.png').convert('RGB'); c=Image.open(C+n+'.png').convert('RGB')
    d=ImageChops.difference(b,c).convert('L').point(lambda v:255 if v>6 else 0); bb=d.getbbox()
    if not bb: print(n,'identical'); continue
    x0,y0,x1,y1=bb; pad=30; x0=max(0,x0-pad); y0=max(0,y0-pad); x1=min(b.width,x1+pad); y1=min(b.height,y1+pad)
    print(n, 'bbox', bb, b.size)
    cb=b.crop((x0,y0,x1,y1)); cc=c.crop((x0,y0,x1,y1)); dd=ImageChops.difference(cb,cc).point(lambda v:min(255,v*5))
    W,H=cb.size; s=Image.new('RGB',(W,H*3+20),'white'); s.paste(cb,(0,0)); s.paste(cc,(0,H+10)); s.paste(dd,(0,2*H+20))
    if s.width>1400: s=s.resize((1400,int(s.height*1400/s.width)))
    s.save(f'pair-{n}.png')

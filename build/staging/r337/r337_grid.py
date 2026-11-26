import sys
from PIL import Image, ImageDraw
src = Image.open('../r328/dl/hollar-flute.jpg').convert('RGB')
c0,c1,r0,r1,s,out = int(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5]),sys.argv[6]
im = src.crop((c0,r0,c1,r1)).resize(((c1-c0)*s,(r1-r0)*s), Image.LANCZOS)
d = ImageDraw.Draw(im)
for c in range((c0//20+1)*20, c1, 20):
    x=(c-c0)*s; d.line([(x,0),(x,6)],fill=(0,0,255)); d.text((x+1,7),str(c),fill=(0,0,255))
for r in range((r0//10+1)*10, r1, 10):
    y=(r-r0)*s; d.line([(0,y),(8,y)],fill=(255,0,0)); d.text((9,y-5),str(r),fill=(255,0,0))
im.save(out)

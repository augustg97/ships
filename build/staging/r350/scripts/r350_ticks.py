# 4x crops of the Asow thumb with a row ruler every 10 rows (labels = thumb rows)
import sys
from PIL import Image, ImageDraw
im=Image.open(sys.argv[1]).convert('RGB')
x0,y0,x1,y1,k=map(int,sys.argv[3:8])
c=im.crop((x0,y0,x1,y1)).resize(((x1-x0)*k,(y1-y0)*k),Image.LANCZOS)
out=Image.new('RGB',(c.width+60,c.height),(255,255,255)); out.paste(c,(60,0))
d=ImageDraw.Draw(out)
for r in range((y0//10+1)*10,y1,10):
    y=(r-y0)*k; d.line([(40,y),(60+12,y)],fill=(255,0,0) if r%50==0 else (0,0,255),width=1); d.text((0,y-6),str(r),fill=(0,0,0))
out.save(sys.argv[2]); print(out.size)

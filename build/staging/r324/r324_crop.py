import sys
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB')
print(im.size)
for name, cx, y0, y1, s in [('tg-fore', 1150, 120, 400, 2), ('tg-main', 620, 40, 400, 2), ('mizzen-top', 320, 420, 760, 2)]:
    c = im.crop((cx-160, y0, cx+160, y1))
    c = c.resize((c.width*s, c.height*s), Image.LANCZOS); d = ImageDraw.Draw(c)
    for r in range(y0, y1, 10):
        yy = (r-y0)*s; L = 30 if r % 50 == 0 else 12
        d.line([(0, yy), (L, yy)], fill=(255, 0, 0), width=1)
        if r % 50 == 0: d.text((34, yy-6), str(r), fill=(255, 0, 0))
    c.save(f'{name}.png')

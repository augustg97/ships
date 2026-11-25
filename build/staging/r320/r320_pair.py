import sys
from PIL import Image, ImageChops
name, cur, out = sys.argv[1], sys.argv[2], sys.argv[3]
a = Image.open(f'/Users/augustgweon/Ships/Research/baselines/frames/{name}.png').convert('RGB'); b = Image.open(cur).convert('RGB')
d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 8 else 0); bb = d.getbbox(); print(name, 'diff bbox', bb)
x0, y0, x1, y1 = bb; pad = 40; box = (max(0, x0-pad), max(0, y0-pad), min(a.width, x1+pad), min(a.height, y1+pad))
ca, cb = a.crop(box), b.crop(box); W = Image.new('RGB', (ca.width*2+10, ca.height), 'white'); W.paste(ca, (0, 0)); W.paste(cb, (ca.width+10, 0))
s = min(1.0, 1500/W.width, 900/W.height); W = W.resize((int(W.width*s), int(W.height*s))); W.save(out); print('box', box)

# pair <frame>: find the changed box against the baseline, crop before|after at 3x
import sys
from PIL import Image, ImageChops
f = sys.argv[1]
a = Image.open(f'/Users/augustgweon/Ships/Research/baselines/frames/{f}.png').convert('RGB')
b = Image.open(f'run1/{f}.png').convert('RGB')
d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 12 else 0)
bb = d.getbbox(); print(f, 'bbox', bb, a.size)
if bb:
    x0, y0, x1, y1 = bb; pad = 30
    box = (max(0, x0 - pad), max(0, y0 - pad), min(a.width, x1 + pad), min(a.height, y1 + pad))
    ca, cb = a.crop(box), b.crop(box)
    s = max(1, min(3, 900 // max(ca.width, ca.height)))
    o = Image.new('RGB', (ca.width * 2 + 8, ca.height), 'white'); o.paste(ca, (0, 0)); o.paste(cb, (ca.width + 8, 0))
    o.resize((o.width * s, o.height * s), Image.LANCZOS).save(f'pair-{f}.png')

# witness pair: before | after, cropped to the changed box, side by side
import sys
from PIL import Image, ImageChops
for n in sys.argv[1:]:
    a = Image.open(f'wit/{n}-top-before.png').convert('RGB'); b = Image.open(f'wit/{n}-top-after.png').convert('RGB')
    d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 14 else 0)
    bb = d.getbbox(); print(n, 'bbox', bb)
    if not bb: continue
    x0, y0, x1, y1 = bb; pad = 120
    box = (max(0, x0 - pad), max(0, y0 - pad), min(a.width, x1 + pad), min(a.height, y1 + pad))
    ca, cb = a.crop(box), b.crop(box)
    o = Image.new('RGB', (ca.width, ca.height * 2 + 10), 'white'); o.paste(ca, (0, 0)); o.paste(cb, (0, ca.height + 10))
    k = min(1.0, 1400 / o.width, 1400 / o.height)
    o.resize((int(o.width * k), int(o.height * k)), Image.LANCZOS).save(f'wit/pair-{n}.png')

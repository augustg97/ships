import sys
from PIL import Image, ImageChops
name, cur = sys.argv[1], sys.argv[2]
a = Image.open(f'/Users/augustgweon/Ships/Research/baselines/frames/{name}.png').convert('RGB'); b = Image.open(f'{cur}/{name}.png').convert('RGB')
d = ImageChops.difference(a, b).convert('L'); bb = d.point(lambda v: 255 if v > 8 else 0).getbbox()
print(name, a.size, 'diff bbox', bb)
W, H = a.size; o = Image.new('RGB', (W, H // 2)); o.paste(a.resize((W // 2, H // 2)), (0, 0)); o.paste(b.resize((W // 2, H // 2)), (W // 2, 0)); o.save(f'pair-{name}.png')
if bb:
    x0, y0, x1, y1 = bb; pad = 30; box = (max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad))
    ca, cb = a.crop(box), b.crop(box); o = Image.new('RGB', (ca.width * 2 + 10, ca.height), 'red'); o.paste(ca, (0, 0)); o.paste(cb, (ca.width + 10, 0)); o.save(f'pair-{name}-crop.png'); print('crop', box)

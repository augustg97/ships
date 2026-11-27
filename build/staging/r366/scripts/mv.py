# usage: mv.py <srcdir> <frame> — writes mv-<frame>.png (baseline | new | moved>12 in red) and prints the moved bbox
import sys
from PIL import Image, ImageChops
src, f = sys.argv[1], sys.argv[2]
a = Image.open(f'/Users/augustgweon/Ships/Research/baselines/frames/{f}.png').convert('RGB')
b = Image.open(f'{src}/{f}.png').convert('RGB')
d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 12 else 0)
print(f, 'moved bbox', d.getbbox(), 'px', sum(1 for v in d.getdata() if v))
m = b.copy(); red = Image.new('RGB', b.size, (255, 0, 0)); m.paste(red, mask=d)
W, H = a.size; out = Image.new('RGB', (W * 3, H)); out.paste(a, (0, 0)); out.paste(b, (W, 0)); out.paste(m, (2 * W, 0))
out.resize((W * 3 // 2, H // 2)).save(f'mv-{f}.png')

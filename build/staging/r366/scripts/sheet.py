# usage: sheet.py <srcdir> out.png frame... — per frame: baseline crop | new crop with moved>12 in red, around the moved bbox
import sys
from PIL import Image, ImageChops, ImageDraw
src, out, frames = sys.argv[1], sys.argv[2], sys.argv[3:]
rows = []
for f in frames:
    a = Image.open(f'/Users/augustgweon/Ships/Research/baselines/frames/{f}.png').convert('RGB'); b = Image.open(f'{src}/{f}.png').convert('RGB')
    d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 12 else 0); bb = d.getbbox()
    if not bb: continue
    m = b.copy(); m.paste(Image.new('RGB', b.size, (255, 0, 0)), mask=d)
    c = (max(0, bb[0] - 60), max(0, bb[1] - 60), min(b.width, bb[2] + 60), min(b.height, bb[3] + 60))
    w = c[2] - c[0]; h = c[3] - c[1]; s = min(1.0, 900 / w, 350 / h)
    r = Image.new('RGB', (int(w * s) * 2 + 10, int(h * s) + 24), 'white')
    r.paste(a.crop(c).resize((int(w * s), int(h * s))), (0, 24)); r.paste(m.crop(c).resize((int(w * s), int(h * s))), (int(w * s) + 10, 24))
    ImageDraw.Draw(r).text((4, 4), f'{f} bbox {bb}', fill='black'); rows.append(r)
W = max(r.width for r in rows); H = sum(r.height for r in rows)
o = Image.new('RGB', (W, H), 'white'); y = 0
for r in rows: o.paste(r, (0, y)); y += r.height
o.save(out); print(out, o.size)

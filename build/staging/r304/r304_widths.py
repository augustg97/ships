import sys, json
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
masts = {'fore': 2600, 'main': 2762, 'mizzen': 2910}
out = {}
for name, c0 in masts.items():
    rows = []
    for r in range(300, 640, 4):
        band = im[r:r+4, c0-20:c0+21].mean(axis=0)
        sky = np.median(np.r_[im[r:r+4, c0-40:c0-25].ravel(), im[r:r+4, c0+25:c0+40].ravel()])
        dark = sky - band                       # positive where darker than sky
        pk = int(np.argmax(dark)); d = dark[pk]
        # width at half the peak darkness, contiguous around the peak
        if d < 6: rows.append((r, None, round(d,1))); continue
        h = d/2; a=pk; b=pk
        while a>0 and dark[a-1]>=h: a-=1
        while b<len(dark)-1 and dark[b+1]>=h: b+=1
        rows.append((r, b-a+1, round(d,1), c0-20+pk))
    out[name] = rows
for n, rows in out.items():
    print(n)
    for x in rows: print('  ', x)
json.dump(out, open(sys.argv[2], 'w'))

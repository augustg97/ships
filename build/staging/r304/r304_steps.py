# Row-by-row darkness of each mast pole on the beset broadside (RMG P00018), and the row where
# the thin upper pole steps to the thick lower mast: the half-way crossing between the two plateaus.
import sys, json
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
# column of each pole by row is tracked (the masts rake); cap-rail rows are r285's reads
masts = {'fore': (2604, 620), 'main': (2768, 630), 'mizzen': (2918, 645)}
res = {}
for name, (c0, cap) in masts.items():
    prof = []
    c = c0
    for r in range(380, 560):
        seg = im[r, c-8:c+9]
        sky = np.median(np.r_[im[r, c-30:c-18], im[r, c+18:c+30]])
        dark = sky - seg
        k = int(np.argmax(dark)); c = c - 8 + k if abs(k-8) <= 2 else c
        # integrated darkness across the pole: proportional to its width when blur exceeds it
        prof.append((r, float(np.clip(dark, 0, None).sum()), c))
    res[name] = prof
def smooth(v, n=5):
    return np.convolve(v, np.ones(n)/n, mode='same')
out = {}
for name, prof in res.items():
    rows = np.array([p[0] for p in prof]); D = smooth(np.array([p[1] for p in prof]))
    print(name, ' '.join(f'{r}:{int(d)}' for r, d in zip(rows[::4], D[::4])))
    out[name] = {'rows': rows.tolist(), 'D': D.tolist(), 'cap': masts[name][1]}
json.dump(out, open(sys.argv[2], 'w'))

"""r334: trace lines along the fluyt's hull on Hollar's 1647 plate with a step limit (r309)."""
import json, sys
from PIL import Image, ImageDraw
import numpy as np
src = Image.open('../r328/dl/hollar-flute.jpg').convert('L')
im = np.asarray(src).astype(float)
def trace(c0, r0, c1, step=5, win=6, maxstep=1.5):
    rows = {c0: float(r0)}; r = float(r0); d = 1 if c1 > c0 else -1
    for c in range(c0 + d*step, c1 + d, d*step):
        lo = int(round(r - maxstep - 2)); hi = int(round(r + maxstep + 2))
        band = im[lo:hi+1, c-win:c+win+1].mean(axis=1)
        i = int(np.argmin(band)); cand = lo + i
        # parabolic subpixel
        if 0 < i < len(band)-1:
            a, b, cc = band[i-1], band[i], band[i+1]; den = a - 2*b + cc
            if den > 0: cand += 0.5*(a - cc)/den
        cand = max(r - maxstep, min(r + maxstep, cand))
        rows[c] = cand; r = cand
    return rows
lines = {}
for name, c0, r0 in [('L962', 1000, 961), ('L985', 1000, 985), ('L1020', 1000, 1020)]:
    a = trace(c0, r0, 1700); b = trace(c0, r0, 750)
    a.update(b); lines[name] = dict(sorted(a.items()))
json.dump({k: {str(c): round(v, 2) for c, v in d.items()} for k, d in lines.items()}, open('trace.json', 'w'))
rgb = src.convert('RGB'); dr = ImageDraw.Draw(rgb)
cols = {'L962': (255, 0, 0), 'L985': (0, 160, 255), 'L1020': (0, 200, 0)}
for k, d in lines.items():
    pts = list(d.items()); dr.line(pts, fill=cols[k], width=1)
    print(k, [(c, round(v, 1)) for c, v in pts if c % 100 == 0])
rgb.crop((700, 760, 1760, 1080)).resize((1590, 480)).save('crops/trace-overlay.png')

"""r334: trace the fluyt's rail cap (the top edge of her side) on Hollar's 1647 plate.
Each point is the strongest light-over-dark edge (5-col window) within maxStep rows of the last."""
import json
from PIL import Image, ImageDraw
import numpy as np
src = Image.open('../r328/dl/hollar-flute.jpg').convert('L')
im = np.asarray(src).astype(float)
STEP, WIN, MAXSTEP = 5, 2, 3.5
def edge_at(c, r_lo, r_hi):
    col = im[:, c-WIN:c+WIN+1].mean(axis=1)
    best, br = -1e9, None
    for r in range(int(np.floor(r_lo)), int(np.ceil(r_hi)) + 1):
        g = col[r-4:r].mean() - col[r:r+4].mean()      # light above, dark below
        if g > best: best, br = g, r
    return br, best
def trace(c0, r0, c1):
    out = {c0: r0}; r = r0; d = 1 if c1 > c0 else -1
    for c in range(c0 + d*STEP, c1 + d, d*STEP):
        nr, g = edge_at(c, r - MAXSTEP, r + MAXSTEP)
        out[c] = nr; r = nr
    return out
r0, _ = edge_at(1720, 780, 800)
tr = trace(1720, r0, 745)
cols = sorted(tr); rows = [tr[c] for c in cols]
steps = [abs(rows[i]-rows[i-1]) for i in range(1, len(rows))]
print('start', 1720, r0, 'points', len(rows), 'max step', max(steps), 'at', cols[int(np.argmax(steps))+1])
for c in cols:
    if c % 50 == 20 or c in (745, 1720): print(c, tr[c])
json.dump({'fromCol': cols[0], 'stepCol': STEP, 'rows': rows}, open('rail-trace.json', 'w'))
rgb = src.convert('RGB'); dr = ImageDraw.Draw(rgb)
dr.line([(c, tr[c]) for c in cols], fill=(255, 0, 0), width=1)
for c, rr in [(724, 902), (1143, 933), (1501, 868)]: dr.ellipse((c-3, rr-3, c+3, rr+3), outline=(0, 120, 255))
rgb.crop((700, 760, 1760, 1000)).resize((2120, 480)).save('crops/rail-overlay.png')

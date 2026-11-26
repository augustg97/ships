"""r334: trace the fluyt's rail cap on Hollar's 1647 plate, GUIDED.
Hand reads off 4x/2x gridded crops (crops/z-bow.png, crops/g-fwd.png, crops/g-aft.png) give a
prior line; every 5 columns the trace takes the strongest light-over-dark edge (the median of an 11-column
window, 4 rows over 4 rows) within 3 rows of that prior. The raw trace is stored, with its max step."""
import json
from PIL import Image, ImageDraw
import numpy as np
src = Image.open('../r328/dl/hollar-flute.jpg').convert('L')
im = np.asarray(src).astype(float)
ANCH = [(740, 906), (785, 907), (860, 916), (900, 921), (920, 930), (1000, 932), (1100, 933), (1205, 933),
        (1225, 912), (1300, 905), (1350, 897), (1400, 887), (1450, 880), (1500, 867), (1550, 857),
        (1600, 842), (1650, 820), (1700, 802), (1720, 790)]
ac, ar = zip(*ANCH)
prior = lambda c: float(np.interp(c, ac, ar))
def edge(c, lo, hi):
    col = np.median(im[:, c-5:c+6], axis=1); best, br = -1e9, None
    for r in range(lo, hi + 1):
        g = col[r-4:r].mean() - col[r:r+4].mean()
        if g > best: best, br = g, r
    return br, best
cols = list(range(740, 1721, 5)); rows = []; gs = []
for c in cols:
    p = prior(c); r, g = edge(c, int(round(p - 3)), int(round(p + 3))); rows.append(r); gs.append(g)
rows = np.array(rows, float)
res = rows - np.array([prior(c) for c in cols])
steps = np.abs(np.diff(rows))
print('points', len(rows), 'max step', steps.max(), 'at', cols[int(steps.argmax()) + 1], 'rms off prior', round(float(np.sqrt((res**2).mean())), 2))
weak = [(c, round(g, 1)) for c, g in zip(cols, gs) if g < 15]
print('weak edges (<15 grey):', len(weak), weak[:20])
json.dump({'fromCol': 740, 'stepCol': 5, 'rows': [int(r) for r in rows], 'anchors': ANCH}, open('rail-trace.json', 'w'))
rgb = src.convert('RGB'); dr = ImageDraw.Draw(rgb)
dr.line(list(zip(cols, rows)), fill=(255, 0, 0), width=1)
for c, rr in [(724, 902), (1143, 933), (1501, 868)]: dr.ellipse((c-3, rr-3, c+3, rr+3), outline=(0, 120, 255))
rgb.crop((700, 760, 1760, 1000)).resize((2120, 480)).save('crops/rail-overlay.png')

"""r324: fit each hoisting yard's line on Hocker's Vasa rig diagram and read where it crosses its mast's axis."""
import sys, json
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
gray = im.mean(axis=2)
# brown spar: darker than the cloth (~215) and the paper (~250); r,g,b ~ (170,120,70)
def spar(r, c):
    R, G, B = im[r, c]; return (R - G) > 30 or gray[r, c] < 150   # cloth reads R-G 13-21 and gray 190-235
def mast_centre(row, c0, c1):
    """centre column of the mast's brown run at this row, the widest run in [c0,c1]"""
    runs, cur = [], []
    for c in range(c0, c1):
        if spar(row, c): cur.append(c)
        elif cur: runs.append(cur); cur = []
    if cur: runs.append(cur)
    runs = [r for r in runs if 3 <= len(r) <= 20]
    if not runs: return None
    r = max(runs, key=len); return (r[0] + r[-1]) / 2
YARDS = {  # name: (mast column window, expected row, columns of the yard to fit each side)
  'fore-topsail':    ((1120, 1185), 396, list(range(1060, 1135)) + list(range(1165, 1250))),
  'main-topsail':    ((560, 605), 381, list(range(490, 568)) + list(range(596, 740))),
  'mizzen-topsail':  ((245, 300), 502, list(range(150, 258)) + list(range(284, 360))),
  'fore-topgallant': ((1130, 1170), 248, list(range(1105, 1140)) + list(range(1162, 1205))),
  'main-topgallant': ((540, 585), 172, list(range(490, 550)) + list(range(572, 640))),
}
out = {}
for name, ((c0, c1), r0, cols) in YARDS.items():
    pts = []
    for c in cols:
        rows = [r for r in range(r0 - 28, r0 + 29) if spar(r, c)]
        if 1 <= len(rows) <= 8 and rows[-1] - rows[0] <= 8: pts.append((c, (rows[0] + rows[-1]) / 2))
    P = np.array(pts); k, b = np.polyfit(P[:, 0], P[:, 1], 1)
    for _ in range(4):   # robust: drop points more than 2 px off the line (sail edges, the white gap's rim) and refit
        keep = np.abs(P[:, 1] - (k * P[:, 0] + b)) <= 2.0
        P = P[keep]; k, b = np.polyfit(P[:, 0], P[:, 1], 1)
    pts = P
    rms = float(np.sqrt(np.mean((P[:, 1] - (k * P[:, 0] + b)) ** 2)))
    # the mast's axis: centres on rows clear of the yard, above and below, fitted as a line col = a*row + d
    mc = [(r, mast_centre(r, c0, c1)) for r in list(range(r0 - 40, r0 - 10)) + list(range(r0 + 10, r0 + 40))]
    mc = [(r, c) for r, c in mc if c is not None]
    M = np.array(mc); a, d = np.polyfit(M[:, 0], M[:, 1], 1)
    # intersect row = k*col + b with col = a*row + d
    row = (k * d + b) / (1 - k * a); col = a * row + d
    out[name] = dict(row=round(float(row), 1), col=round(float(col), 1), slope=round(float(k), 4), rms=round(rms, 2),
                     n=len(pts), mastRows=len(mc), mastRakePxPerRow=round(float(a), 4))
    print(name, out[name])
json.dump(out, open('read.json', 'w'), indent=1)

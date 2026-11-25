"""r325 (0y167): the topmast tops on Hocker's Vasa rig diagram (p. 31), read by pixel.
For each mast the axis is fitted on the spar's centres in rows clear of the top; the run through the axis is
measured in every row; the top is the rows whose run is at least 0.6 of the widest; its row is their centre.
The lower top on the same mast is read by the same test, so the topmast top's size is a ratio on one plate."""
import sys, json, numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
g = im.mean(axis=2)
sp = ((im[:, :, 0] - im[:, :, 1]) > 30) | (g < 150)
def run(r, c):
    w = sp[r, c - 3:c + 4]
    if not w.any(): return None
    c = c - 3 + int(np.argmax(w)); a = b = c
    while sp[r, a - 1]: a -= 1
    while sp[r, b + 1]: b += 1
    return a, b
def axis(rows, c0):
    pts = []
    for r in rows:
        ab = run(r, c0(r))
        if ab and ab[1] - ab[0] < 14: pts.append((r, (ab[0] + ab[1]) / 2))
    R = np.array(pts); k, m = np.polyfit(R[:, 0], R[:, 1], 1)
    res = R[:, 1] - (k * R[:, 0] + m)
    return k, m, float(np.sqrt((res ** 2).mean())), len(R)
def top(name, win, clear, c0):
    k, m, rms, n = axis(clear, c0)
    w = []
    for r in win:
        ab = run(r, int(round(k * r + m)))
        w.append((r, 0 if not ab else ab[1] - ab[0] + 1, ab))
    mx = max(x for _, x, _ in w); wide = [(r, ab) for r, x, ab in w if x >= 0.6 * mx]
    rows = [r for r, _ in wide]
    out = dict(rowTop=rows[0], rowBottom=rows[-1], row=(rows[0] + rows[-1]) / 2, widthPx=mx,
               axis=dict(slope=round(k, 4), rmsPx=round(rms, 2), n=n))
    print(name, out); return out
F = lambda r: 1150
M = lambda r: int(560.7 + (r - 175.5) * 0.109)
res = {
  'fore-topmast-top': top('fore topmast top', range(345, 392), list(range(300, 345)) + list(range(375, 392)), F),
  'fore-lower-top': top('fore lower top', range(660, 712), list(range(600, 662)) + list(range(700, 740)), F),
  'main-topmast-top': top('main topmast top', range(315, 372), list(range(270, 318)) + list(range(352, 372)), M),
  'main-lower-top': top('main lower top', range(655, 712), list(range(600, 660)) + list(range(698, 740)), M),
}
json.dump(res, open('read.json', 'w'), indent=1)

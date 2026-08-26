# r160: segment the Cadiz broadside (17.27 px/m) — most-forward/most-aft standing
# column at every metre of height, and the per-column silhouette top profile.
# Anchors re-read this round (r159 note's rule: do not inherit its ~3060 px):
#   stem tip (351, 1709), aft counter tip (3470, ~1850), waterline fit below.
import numpy as np, json, sys
from PIL import Image

im = np.asarray(Image.open('build/staging/r159/AzzamCadiz.jpg').convert('RGB')).astype(int)
H, W, _ = im.shape
R, G, B = im[:,:,0], im[:,:,1], im[:,:,2]
bright = (R + G + B) / 3
sat = im.max(axis=2) - im.min(axis=2)

X_STEM, Y_STEM = 351, 1709
X_AFT = 3470
LOA = 180.6
S = (X_AFT - X_STEM) / LOA          # px per metre
# waterline: fit on boot-top bottom edge x 500..1900 (visible there), extended fleet-long
xs_wl, ys_wl = [], []
for x in range(500, 1900, 25):
    col = bright[1820:1885, x]
    dark = np.where(col < 90)[0]
    if len(dark): xs_wl.append(x); ys_wl.append(1820 + dark.max())
b, a = np.polyfit(xs_wl, ys_wl, 1)
def ywl(x): return a + b * x
print(f"scale {S:.3f} px/m   waterline fit y = {a:.1f} + {b:.5f}x  (n={len(xs_wl)})")

# ship-ish: bright enough, not blue-dominant (sky/water are B>R; ship is warm white,
# the shadowed counter neutral gray), not saturated (trees/awnings)
shipish = (bright > 105) & ((R - B) > -6) & (sat < 70)
def erode(m):
    r = m.copy()
    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
        r &= np.roll(np.roll(m, dy, 0), dx, 1)
    return r
core = erode(erode(shipish))

# exclusion boxes (iterated by LOOKING at the overlay; each is background that
# matches the criterion): none yet on first pass
EXCL = json.load(open('build/staging/r160/excl.json')) if __import__('os').path.exists('build/staging/r160/excl.json') else []
for x0, y0, x1, y1 in EXCL: shipish[y0:y1, x0:x1] = False

# flood fill (scipy-free BFS on a bounding window)
from collections import deque
WIN = (300, 1150, 3550, 1875)  # x0,y0,x1,y1 — the ship incl mast, above waterline
x0, y0, x1, y1 = WIN
sub = core[y0:y1, x0:x1]
seen = np.zeros_like(sub, dtype=bool)
seeds = [(1500,1800),(2000,1700),(2200,1500),(600,1780),(3300,1790),(2341,1300),(2600,1600)]
dq = deque()
for sx, sy in seeds:
    lx, ly = sx - x0, sy - y0
    if sub[ly, lx]: seen[ly, lx] = True; dq.append((lx, ly))
    else: print(f"  seed ({sx},{sy}) not shipish — skipped")
h, w = sub.shape
while dq:
    cx, cy = dq.popleft()
    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx, ny = cx + dx, cy + dy
        if 0 <= nx < w and 0 <= ny < h and sub[ny, nx] and not seen[ny, nx]:
            seen[ny, nx] = True; dq.append((nx, ny))
comp = np.zeros_like(shipish); comp[y0:y1, x0:x1] = seen
# dilate the eroded component back out by 2, clipped to the raw mask
for _ in range(2):
    d = comp.copy()
    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
        d |= np.roll(np.roll(comp, dy, 0), dx, 1)
    comp = d & shipish
comp[:, :305] = False; comp[:, 3545:] = False
comp[:1155, :] = False; comp[1872:, :] = False
print(f"component px: {comp.sum()}")

# overlay: component edge in red on a half-res copy
ov = np.asarray(Image.open('build/staging/r159/AzzamCadiz.jpg').convert('RGB')).copy()
edge = comp ^ np.roll(comp, 1, 0) | (comp ^ np.roll(comp, 1, 1))
ov[edge] = [255, 0, 0]
Image.fromarray(ov[1100:1900, 250:3600]).save('build/staging/r160/overlay.png')

# per-metre row extents
rows = []
for hm in np.arange(0.5, 24.1, 0.5):
    y = int(round(ywl((X_STEM + X_AFT) / 2) - hm * S))
    xs = np.where(comp[y])[0]
    if len(xs):
        u_f = (xs.min() - X_STEM) / (X_AFT - X_STEM)
        u_a = (xs.max() - X_STEM) / (X_AFT - X_STEM)
        rows.append((hm, xs.min(), xs.max(), round(u_f, 3), round(u_a, 3)))
print("\n h(m)   xF    xA     uF     uA")
for r in rows: print(f" {r[0]:5.1f} {r[1]:5d} {r[2]:5d}  {r[3]:.3f}  {r[4]:.3f}")

# per-column silhouette top (25-px steps; metres over waterline)
print("\n u      x   topM")
tops = []
for x in range(X_STEM, X_AFT, 25):
    ys = np.where(comp[:, x])[0]
    if len(ys):
        tm = (ywl(x) - ys.min()) / S
        tops.append((round((x - X_STEM)/(X_AFT - X_STEM), 3), x, round(tm, 2)))
for t in tops: print(f" {t[0]:.3f} {t[1]:5d} {t[2]:6.2f}")
json.dump({"scale": S, "wl": [a, b], "rows": rows, "tops": tops},
          open('build/staging/r160/segment-out.json', 'w'))

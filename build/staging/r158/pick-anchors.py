#!/usr/bin/env python3
"""r158: pick every Myeongnyang campaign anchor and shore probe OFF THE RASTER.

Decodes the baked patch (myeongnyang.png, the app's own R/G metre encoding), then for
each named candidate finds the nearest cell whose 3x3 neighborhood is entirely below
-2 m (water anchors) or above +15 m (land witnesses), and prints the cell's lon/lat
rounded to 4 dp. The rounded point is re-read through the same bilinear formula
battle.js btShoreElev uses, so what ships is what the audit will sample.

Run from the project root with the Studio interpreter (needs numpy + PIL):
  "$STUDIO/.venv/bin/python" build/staging/r158/pick-anchors.py
"""
import numpy as np
from PIL import Image

im = np.asarray(Image.open('web/data/terrain/myeongnyang.png').convert('RGB')).astype(np.float64)
E = (im[:, :, 0] * 256 + im[:, :, 1]) / 65535 * 20000 - 11000
H, W = E.shape
lon0, lat0, lon1, lat1 = 126.10, 34.38, 126.60, 34.72

def ll2px(lon, lat):
    return int((lon - lon0) / (lon1 - lon0) * W), int((1 - (lat - lat0) / (lat1 - lat0)) * H)

def px2ll(x, y):
    return round(lon0 + (x + .5) / W * (lon1 - lon0), 4), round(lat1 - (y + .5) / H * (lat1 - lat0), 4)

def bilin(lon, lat):  # battle.js btShoreElev, exactly
    u = (lon - lon0) / (lon1 - lon0); v = (lat - lat0) / (lat1 - lat0)
    if u <= 0 or u >= 1 or v <= 0 or v >= 1: return -30
    x = min(W - 1.001, max(0, u * W - 0.5)); y = min(H - 1.001, max(0, (1 - v) * H - 0.5))
    xi, yi = int(x), int(y); fx, fy = x - xi, y - yi
    a = E[yi, xi] * (1 - fx) + E[yi, xi + 1] * fx
    b = E[yi + 1, xi] * (1 - fx) + E[yi + 1, xi + 1] * fx
    return a * (1 - fy) + b * fy

def pick(lon, lat, r_px, water=True):
    cx, cy = ll2px(lon, lat); best = None
    for dy in range(-r_px, r_px + 1):
        for dx in range(-r_px, r_px + 1):
            x, y = cx + dx, cy + dy
            if not (3 < x < W - 3 and 3 < y < H - 3): continue
            n = E[y - 1:y + 2, x - 1:x + 2]
            ok = (n.max() < -2.0) if water else (n.min() > 15.0)
            if ok:
                d = dx * dx + dy * dy
                if best is None or d < best[0]: best = (d, x, y)
    if not best: return None
    _, x, y = best
    lo, la = px2ll(x, y)
    return lo, la, round(bilin(lo, la), 1)

WATER = {
    'fight basin N of neck': (126.296, 34.582, 25),
    'Usuyeong road':         (126.288, 34.586, 25),
    'neck mid-channel':      (126.3035, 34.571, 25),
    'S mouth of the neck':   (126.3075, 34.559, 25),
    'channel SE':            (126.320, 34.550, 25),
    'Byeokpajin road':       (126.350, 34.545, 25),
    'sound mid':             (126.410, 34.515, 25),
    'Eoran road':            (126.50, 34.46, 80),
    'NW withdrawal (Dangsa)': (126.17, 34.64, 80),
}
LAND = {
    'Jindo bank W of neck':  (126.295, 34.566, 25),
    'Haenam bank E of neck': (126.312, 34.573, 25),
    'Jindo massif':          (126.320, 34.480, 25),
    'Haenam hills':          (126.400, 34.600, 25),
}
print('WATER (3x3 all < -2 m):')
for n, (lo, la, r) in WATER.items(): print(f'  {n:26s} {pick(lo, la, r, True)}')
print('LAND (3x3 all > +15 m):')
for n, (lo, la, r) in LAND.items(): print(f'  {n:26s} {pick(lo, la, r, False)}')

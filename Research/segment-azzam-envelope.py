#!/usr/bin/env python3
"""Read Azzam's upper silhouette envelope off the Fricke broadside.

Round 97. Two questions the envelope answers with numbers:
  1. The REAL tier roof heights — each tier's roof is exposed where the tier above
     steps back, so the top of the silhouette there IS that roof's height over the
     waterline. deckM 3.05 was a uniform guess; this reads the actual staircase.
  2. The stern quarter aft of the house (u > 0.93): the photo shows terraces
     stepping down to a low aft deck; the model runs plain sheer at 9 m. The
     envelope gives each step's u and height.

Method: the yard backdrop (trees, yellow sheds, teal cranes, brick) means a
sky-difference scan reads the buildings as ship. Instead scan UP from the
waterline collecting SHIP-WHITE pixels — bright and colour-neutral-to-bluish —
with a gap tolerance for windows, tinted bands and doors. The envelope is the
top of the last bright run before a gap too tall to be glazing.

Known occluders, skipped in the tier reads: the UAE flag u 0.83-0.87, the domes
on tier 2 at u 0.763/0.803, the stack/fin u 0.69-0.74.

Same anchors as segment-azzam-windows.py (this file, 2268x1375):
  stem tip x=332, aft extreme x=1950, waterline y=941. 8.959 px/m.
"""
import numpy as np
from PIL import Image

IMG = "/Users/augustgweon/Ships/Research/references/azzam-broadside-fricke-2014.jpg"
LOA = 180.6
X_STEM, X_STERN, Y_WL = 332, 1950, 941
PXM = (X_STERN - X_STEM) / LOA

im = np.asarray(Image.open(IMG).convert("RGB")).astype(int)
R, G, B = im[..., 0], im[..., 1], im[..., 2]
lum = (R + G + B) / 3.0
# ship-white: bright, not yellow (building), not green/teal (trees, crane)
shipish = (lum >= 140) & (R - B < 20) & (G - R < 28) & (B >= R)

def u(x): return (x - X_STEM) / (X_STERN - X_STEM)
def hm(y): return (Y_WL - y) / PXM

GAP_PX = int(3.4 * PXM)          # windows/bands up to 3.4 m tall may interrupt white
env = {}
for x in range(X_STEM, X_STERN + 1):
    top = None
    y = Y_WL - 3
    gap = 0
    while y > 60:
        if shipish[y, x]:
            top = y
            gap = 0
        else:
            gap += 1
            if top is not None and gap > GAP_PX:
                break
        y -= 1
    if top is not None:
        env[x] = hm(top)

def zone(name, ua, ub):
    xs = [x for x in range(int(X_STEM + ua * (X_STERN - X_STEM)),
                           int(X_STEM + ub * (X_STERN - X_STEM)) + 1) if x in env]
    if not xs:
        print(f"{name:28s} u {ua:.3f}-{ub:.3f}  (no read)")
        return
    hs = np.array([env[x] for x in xs])
    print(f"{name:28s} u {ua:.3f}-{ub:.3f}  median {np.median(hs):5.2f} m   "
          f"p10 {np.percentile(hs,10):5.2f}  p90 {np.percentile(hs,90):5.2f}  n {len(hs)}")

print(f"scale {PXM:.3f} px/m\n")
print("── tier roofs, read where each roof is exposed ──")
zone("foredeck sheer", 0.10, 0.25)
zone("tier 0 roof (fore)", 0.285, 0.345)
zone("tier 0 roof (aft)", 0.892, 0.925)
zone("tier 1 roof (fore)", 0.355, 0.465)
zone("tier 1 roof (aft)", 0.868, 0.885)
zone("tier 2 roof (fore)", 0.475, 0.515)
zone("tier 2 roof (aft, fwd of domes)", 0.746, 0.758)
zone("tier 2 roof (aft, aft of domes)", 0.808, 0.818)
zone("crest roof (blockTopM zone)", 0.560, 0.690)

print("\n── the stern quarter, u 0.90 → 1.00 every 0.005 ──")
for k in range(int(0.90 / 0.005), int(1.0 / 0.005) + 1):
    uu = k * 0.005
    x = int(X_STEM + uu * (X_STERN - X_STEM))
    if x in env:
        print(f"  u {uu:.3f}   top {env[x]:5.2f} m")
    else:
        print(f"  u {uu:.3f}   (no read)")

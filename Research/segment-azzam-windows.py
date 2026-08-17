#!/usr/bin/env python3
"""Segment the Azzam broadside (Fricke 2014) into window rows and window GROUPS.

Round 96. The r95 leftover: the model's tier bands run as one continuous ribbon the
full length of every tier, and the freeboard is bare; the photograph shows grouped
punched windows with long blank runs, different per tier, plus two window rows in
the hull side and a line of forward portholes. This script reads those groups off
the plate as numbers — u-spans, pitches, heights — so the record can carry them.

Anchors, fixed by hand off gridded crops (this file, 2268x1375):
  stem tip x=332, aft extreme x=1950, waterline y=941. Scale printed below.
u = 0 at the bow (the model's own convention: hull +x is aft).
"""
import numpy as np
from PIL import Image

IMG = "/Users/augustgweon/Ships/Research/references/azzam-broadside-fricke-2014.jpg"
LOA = 180.6
X_STEM, X_STERN, Y_WL = 332, 1950, 941
PXM = (X_STERN - X_STEM) / LOA

im = np.asarray(Image.open(IMG).convert("RGB")).astype(np.int32)
lum = im.sum(axis=2) / 3.0
dark = lum < 110

def u(x): return (x - X_STEM) / (X_STERN - X_STEM)
def hm(y): return (Y_WL - y) / PXM
print(f"scale {PXM:.3f} px/m   (stem {X_STEM}, stern {X_STERN}, WL {Y_WL})")

def runs_at(y, gap_px=4, min_px=3):
    xs = np.where(dark[y, X_STEM:X_STERN])[0] + X_STEM
    if not len(xs): return []
    out, s, p = [], xs[0], xs[0]
    for x in xs[1:]:
        if x - p > gap_px:
            if p - s + 1 >= min_px: out.append((s, p))
            s = x
        p = x
    if p - s + 1 >= min_px: out.append((s, p))
    return out

def groups_at(y, gap_m=1.2):
    """windows merged into groups across gaps below gap_m"""
    rs = runs_at(y)
    if not rs: return []
    gs, cur = [], [rs[0]]
    for r in rs[1:]:
        if (r[0] - cur[-1][1]) / PXM <= gap_m: cur.append(r)
        else: gs.append(cur); cur = [r]
    gs.append(cur)
    return gs

# ── find the densest row inside each feature band, then report its groups ──────
BANDS = [
    ("porthole row", 908, 932),
    ("hull windows", 862, 900),
    ("tier 0",       824, 858),
    ("tier 1",       790, 822),
    ("tier 2",       758, 789),
    ("tier 3",       736, 757),
]
for name, y0, y1 in BANDS:
    best_y = max(range(y0, y1 + 1), key=lambda y: dark[y, X_STEM:X_STERN].sum())
    print(f"\n== {name}: peak row y={best_y}  h={hm(best_y):.2f} m over WL ==")
    for gi, g in enumerate(groups_at(best_y)):
        a, b = g[0][0], g[-1][1]
        n = len(g)
        pitch = (b - a) / PXM / max(1, n - 1) if n > 1 else 0
        widths = np.mean([(r[1] - r[0] + 1) / PXM for r in g])
        print(f"  group {gi}: u {u(a):.3f}–{u(b):.3f}  ({(b-a)/PXM:5.1f} m)  "
              f"{n:2d} lights, pitch {pitch:4.2f} m, light width {widths:4.2f} m")

# ── vertical extent of glazing: dark y-runs down a column through a window ─────
print("\n== vertical sections (columns through windows) ==")
for x in [800, 1000, 1150, 1250, 1350, 1500, 1600]:
    col = np.where(dark[700:940, x])[0] + 700
    if not len(col): continue
    runs, s, p = [], col[0], col[0]
    for y in col[1:]:
        if y - p > 3: runs.append((s, p)); s = y
        p = y
    runs.append((s, p))
    txt = "  ".join(f"{hm(b):.1f}–{hm(a):.1f}m" for a, b in runs if b - a >= 3)
    print(f"  x={x} (u {u(x):.3f}): {txt}")

# ── the foredeck cap strip: dark line at the sheer, forward of the house ───────
print("\n== foredeck cap strip thickness (dark run nearest the sheer, x 420–700) ==")
th = []
for x in range(420, 700, 20):
    col = np.where(lum[835:880, x] < 130)[0] + 835
    if not len(col): continue
    runs, s, p = [], col[0], col[0]
    for y in col[1:]:
        if y - p > 2: runs.append((s, p)); s = y
        p = y
    runs.append((s, p))
    a, b = runs[0]
    th.append((b - a + 1) / PXM)
    if x % 100 == 0:
        print(f"  x={x}: top {hm(a):.2f} m, strip {(b-a+1)/PXM:.2f} m thick")
print(f"  median cap strip thickness: {np.median(th):.2f} m over {len(th)} columns")

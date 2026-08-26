#!/usr/bin/env python3
"""r157: characterise the under-gate residue on a frame — where the changed pixels ARE.

Compares Research/baselines/<name>.png against Research/baselines/_current/<name>.png,
prints changed_frac / mean_abs / the changed-pixel bounding box and its densest clusters,
and writes an amplified diff plus a crop of the densest cluster to build/staging/r157/.
"""
import sys
import numpy as np
from PIL import Image

name = sys.argv[1]
thr = float(sys.argv[2]) if len(sys.argv) > 2 else 8.0

base = np.asarray(Image.open(f"Research/baselines/frames/{name}.png").convert("RGB"), dtype=np.int16)
cur = np.asarray(Image.open(f"Research/baselines/_current/{name}.png").convert("RGB"), dtype=np.int16)
if base.shape != cur.shape:
    print(f"{name}: SHAPE MISMATCH {base.shape} vs {cur.shape}"); sys.exit(1)

d = np.abs(base - cur).max(axis=2)
changed = d > thr
frac = changed.mean()
print(f"{name}: changed_frac {frac*100:.4f}%  mean_abs {np.abs(base-cur).mean():.4f}  "
      f"px>{thr:.0f}: {changed.sum()}")

ys, xs = np.nonzero(changed)
if len(xs):
    print(f"  bbox x {xs.min()}..{xs.max()}  y {ys.min()}..{ys.max()}  "
          f"(frame {d.shape[1]}x{d.shape[0]})")
    # densest 128x128 tile
    H, W = d.shape
    ts = 128
    best, bx, by = -1, 0, 0
    for ty in range(0, H, ts):
        for tx in range(0, W, ts):
            c = changed[ty:ty+ts, tx:tx+ts].sum()
            if c > best: best, bx, by = c, tx, ty
    print(f"  densest tile ({bx},{by}) holds {best} of {changed.sum()} changed px")
    amp = np.clip(d * 8, 0, 255).astype(np.uint8)
    Image.fromarray(amp).save(f"build/staging/r157/{name}-ampdiff.png")
    x0, y0 = max(0, bx-192), max(0, by-192)
    x1, y1 = min(W, bx+ts+192), min(H, by+ts+192)
    Image.fromarray(cur[y0:y1, x0:x1].astype(np.uint8)).save(
        f"build/staging/r157/{name}-cur-crop.png")
    Image.fromarray(base[y0:y1, x0:x1].astype(np.uint8)).save(
        f"build/staging/r157/{name}-base-crop.png")
    print(f"  wrote {name}-ampdiff.png and base/cur crops at ({x0},{y0})..({x1},{y1})")

#!/usr/bin/env python3
"""r87: score _current (captured by the parallel session's check) against the committed
baselines with frame_baseline.py's own arithmetic, so the accepts consume captures whose
classification I have verified myself. Same formula: per-pixel channel-max delta, changed
fraction over PIXEL_EPS=8, mean absolute delta."""
import json, sys
import numpy as np
from PIL import Image

BASE = 'Research/baselines'
PIXEL_EPS = 8

def rgb(p):
    with Image.open(p) as im:
        return np.asarray(im.convert('RGB'), dtype=np.int16)

frames = json.load(open(f'{BASE}/frames.json'))['frames']
moved, new, missing = [], [], []
for f in frames:
    n = f['name']
    try:
        cur = rgb(f'{BASE}/_current/{n}.png')
    except FileNotFoundError:
        missing.append(n); continue
    try:
        base = rgb(f'{BASE}/frames/{n}.png')
    except FileNotFoundError:
        new.append(n); continue
    if base.shape != cur.shape:
        print(f'{n:28s} SHAPE {base.shape} vs {cur.shape}'); moved.append(n); continue
    d = np.abs(base - cur)
    cf = float((d.max(axis=2) > PIXEL_EPS).mean())
    ma = float(d.mean())
    flag = 'MOVED' if (cf > 0.0005 or ma > 0.15) else 'ok'
    if flag == 'MOVED':
        moved.append(n)
    print(f'{n:28s} {cf*100:8.3f}% {ma:8.3f}  {flag}')
print(f'\nmoved: {len(moved)}  new: {len(new)}  missing: {len(missing)}')
print('new:', new)
print('missing:', missing)

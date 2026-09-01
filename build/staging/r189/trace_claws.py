# r189 — claw centreline traces from the fig. 3a mask, plus an annotated overlay.
import numpy as np
from PIL import Image, ImageDraw

A = np.load('fig3a-mask.npy')
H, W = A.shape
top, bot, lft, rgt, cx = 50, 743, 56, 503, 270
Ht = bot - top + 1

def runs(x):
    col = A[:, x]
    out = []
    y = 0
    while y < H:
        if col[y]:
            y0 = y
            while y < H and col[y]:
                y += 1
            out.append((y0, y - 1))
        else:
            y += 1
    return out

# upper claws: highest run per column outside the shank; lower claws: lowest run
up_r, up_l, lo_r, lo_l = [], [], [], []
for x in range(cx + 35, rgt + 1, 4):
    rs = runs(x)
    if rs:
        r0 = rs[0]; up_r.append((x, (r0[0] + r0[1]) / 2, r0[1] - r0[0] + 1))
        r1 = rs[-1]; lo_r.append((x, (r1[0] + r1[1]) / 2, r1[1] - r1[0] + 1))
for x in range(lft, cx - 35, 4):
    rs = runs(x)
    if rs:
        r0 = rs[0]; up_l.append((x, (r0[0] + r0[1]) / 2, r0[1] - r0[0] + 1))
        r1 = rs[-1]; lo_l.append((x, (r1[0] + r1[1]) / 2, r1[1] - r1[0] + 1))

def fit_dir(pts, frac0, frac1, label):
    # slope over a span of the claw, pts sorted by |x - cx| ascending
    pts = sorted(pts, key=lambda p: abs(p[0] - cx))
    n = len(pts)
    seg = pts[int(frac0 * n):max(int(frac0 * n) + 2, int(frac1 * n))]
    xsv = np.array([p[0] for p in seg]); ysv = np.array([p[1] for p in seg])
    m, b = np.polyfit(xsv, ysv, 1)
    # angle above horizontal, y down: dy/dx = m, up is -m for the right side
    import math
    ang = math.degrees(math.atan2(-(m if xsv[-1] > cx else -m) * 1.0, 1.0))
    print(f'{label}: n={len(seg)} x[{xsv.min()},{xsv.max()}] slope {m:+.3f} '
          f'-> {ang:+.1f} deg above horizontal')
    return m

print('--- upper-right claw (root -> tip) ---')
fit_dir(up_r, 0.05, 0.40, 'root third')
fit_dir(up_r, 0.60, 0.98, 'tip  third')
print('--- upper-left claw ---')
fit_dir(up_l, 0.05, 0.40, 'root third')
fit_dir(up_l, 0.60, 0.98, 'tip  third')
print('--- lower-right claw ---')
fit_dir(lo_r, 0.05, 0.40, 'root third')
fit_dir(lo_r, 0.60, 0.98, 'tip  third')
print('--- lower-left claw ---')
fit_dir(lo_l, 0.05, 0.40, 'root third')
fit_dir(lo_l, 0.60, 0.98, 'tip  third')

# thickness along the upper-right claw
th = sorted(up_r, key=lambda p: abs(p[0] - cx))
n = len(th)
for f in (0.1, 0.5, 0.9):
    p = th[int(f * (n - 1))]
    print(f'upper-right thickness at {f:.1f} of trace: {p[2]}px at x={p[0]}')

# lower-claw tips: farthest run-centres
lo_r_t = max(lo_r, key=lambda p: p[0]); lo_l_t = min(lo_l, key=lambda p: p[0])
print(f'lower-right tip trace end ({lo_r_t[0]},{lo_r_t[1]:.0f}), '
      f'lower-left ({lo_l_t[0]},{lo_l_t[1]:.0f})')

# annotated overlay
im = Image.open('fig3a-crop.png').convert('RGB')
d = ImageDraw.Draw(im)
for pts, col in ((up_r, (255, 0, 0)), (up_l, (255, 0, 0)),
                 (lo_r, (0, 120, 255)), (lo_l, (0, 120, 255))):
    for x, y, t in pts:
        d.ellipse((x - 1, y - 1, x + 1, y + 1), fill=col)
# landmarks
lm = [((56, 536), 'Ltip'), ((503, 563), 'Rtip'), ((364, 743), 'low'),
      ((cx, 709), 'crownB'), ((cx, top), 'ringT')]
for (x, y), t in lm:
    d.line((x - 8, y, x + 8, y), fill=(0, 180, 0), width=2)
    d.line((x, y - 8, x, y + 8), fill=(0, 180, 0), width=2)
    d.text((x + 6, y + 4), t, fill=(0, 180, 0))
d.line((cx, top, cx, bot), fill=(0, 180, 0, 30), width=1)
im.save('fig3a-annotated.png')
print('wrote fig3a-annotated.png')

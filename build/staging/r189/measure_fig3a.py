# r189 — part-proportion measurement of Matsui 2013 fig. 3a (Penglai 1984, 全長 2.15 m).
# The crop is fig3a-crop.png, taken from a 300-DPI render of PDF p. 14 (paper p. 39).
# Threshold, keep the largest connected component (drops the 'a' label and caption),
# and read the part extremes in pixels. The caption's 2.15 m sets px/m.
import numpy as np
from PIL import Image
from collections import deque

im = np.array(Image.open('fig3a-crop.png').convert('L'))
H, W = im.shape
dark = im < 128

# largest connected component (8-neighbour)
lab = np.zeros((H, W), np.int32)
cur = 0
sizes = {}
for y0 in range(H):
    for x0 in range(W):
        if dark[y0, x0] and lab[y0, x0] == 0:
            cur += 1
            q = deque([(y0, x0)])
            lab[y0, x0] = cur
            n = 0
            while q:
                y, x = q.popleft()
                n += 1
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < H and 0 <= xx < W and dark[yy, xx] and lab[yy, xx] == 0:
                            lab[yy, xx] = cur
                            q.append((yy, xx))
            sizes[cur] = n
big = max(sizes, key=sizes.get)
A = lab == big
ys, xs = np.nonzero(A)
print(f'crop {W}x{H}, components {cur}, anchor px {sizes[big]}')
top, bot = ys.min(), ys.max()
lft, rgt = xs.min(), xs.max()
print(f'bbox x [{lft},{rgt}] y [{top},{bot}]  H_total {bot-top+1}px  W_total {rgt-lft+1}px')
pxm = (bot - top + 1) / 2.15
print(f'px/m = {pxm:.1f}  (1 px = {1000/pxm:.1f} mm)')

# column occupancy of the shank: for rows in the upper 60%, width and centre
def row_span(y):
    r = np.nonzero(A[y])[0]
    return (r.min(), r.max()) if len(r) else None

# shank centreline from rows 15%..55% down
cxs = []
for y in range(top + int(0.15 * (bot - top)), top + int(0.55 * (bot - top))):
    s = row_span(y)
    if s:
        cxs.append((s[0] + s[1]) / 2)
cx = int(round(np.median(cxs)))
print(f'shank centreline x ~ {cx}')

# widths at fractions of total height
for f in (0.06, 0.12, 0.25, 0.40, 0.55, 0.65):
    y = top + int(f * (bot - top))
    s = row_span(y)
    print(f'row at {f:.2f}H (y={y}): span {s}, width {s[1]-s[0]+1}px')

# head: the top 8% — max width and the hole (light pixels inside dark bounds)
headrows = range(top, top + int(0.08 * (bot - top)))
hw = 0
for y in headrows:
    s = row_span(y)
    if s:
        hw = max(hw, s[1] - s[0] + 1)
print(f'head max width (top 8%): {hw}px')
# hole: light pixels enclosed within the component's rows near the top
hole = []
for y in range(top, top + int(0.06 * (bot - top))):
    r = np.nonzero(A[y])[0]
    if len(r) > 1:
        for x in range(r.min(), r.max() + 1):
            if not A[y, x]:
                hole.append((x, y))
if hole:
    hx = [p[0] for p in hole]; hy = [p[1] for p in hole]
    print(f'hole bbox x [{min(hx)},{max(hx)}] y [{min(hy)},{max(hy)}] '
          f'({max(hx)-min(hx)+1}x{max(hy)-min(hy)+1}px)')

# claw tips: extreme points
i = np.argmin(xs); print(f'leftmost  point ({xs[i]},{ys[i]})')
i = np.argmax(xs); print(f'rightmost point ({xs[i]},{ys[i]})')
i = np.argmax(ys); print(f'lowest    point ({xs[i]},{ys[i]})')
# lowest point on the centreline (crown base): columns within +/-6 of cx
cc = [(y, x) for y, x in zip(ys, xs) if abs(x - cx) <= 6]
ymax_c = max(cc)[0]
print(f'lowest dark on centreline (crown base) y = {ymax_c}')

# tips as fractions
Ht = bot - top + 1
for name, x, y in [('left', xs[np.argmin(xs)], ys[np.argmin(xs)]),
                   ('right', xs[np.argmax(xs)], ys[np.argmax(xs)])]:
    print(f'{name} tip: reach {(abs(int(x)-cx))/Ht:.3f}H, height above crown-base '
          f'{(ymax_c - int(y))/Ht:.3f}H, below ring-top {(int(y)-top)/Ht:.3f}H')

np.save('fig3a-mask.npy', A)

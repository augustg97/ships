"""r324 prep for 0y167: rows where the spar run through the mast is widest (a top or crosstrees) on each upper section of Vasa's plate."""
import sys, numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
g = im.mean(axis=2)
sp = ((im[:, :, 0] - im[:, :, 1]) > 30) | (g < 150)
def width(r, c):
    if not sp[r, c - 3:c + 4].any(): return 0
    c = c - 3 + int(np.argmax(sp[r, c - 3:c + 4])); a = b = c
    while sp[r, a - 1]: a -= 1
    while sp[r, b + 1]: b += 1
    return b - a + 1
for name, rows, colAt in [('fore topmast top', range(340, 395), lambda r: 1150), ('main topmast top', range(310, 372), lambda r: int(560.7 + (r - 175.5) * 0.109)),
                          ('mizzen topmast top', range(462, 500), lambda r: int(270.3 + (r - 504.9) * 0.112)),
                          ('fore topgallant top', range(222, 245), lambda r: 1151), ('main topgallant top', range(136, 170), lambda r: int(560.7 + (r - 175.5) * 0.109)),
                          ('fore lower top', range(665, 700), lambda r: 1150)]:
    w = [(r, width(r, colAt(r))) for r in rows]
    mx = max(x for _, x in w); wide = [r for r, x in w if x >= 0.6 * mx]
    print(f"{name}: max width {mx} px, rows {wide[0]}-{wide[-1]} (centre {(wide[0] + wide[-1]) / 2})")

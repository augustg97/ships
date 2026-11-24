# r306: reads each after gaff off Hurley's beset broadside (RMG P00018, build/hurley-broadside.png).
# For every column over the gaff's visible run, the darkest row in a 13-px band about a seed line
# (blur 1.2 px); a line is fitted to those rows; the mast's axis is the darkest column of the pole
# 12 rows under the throat; the gaff runs from that axis along the fitted line to its last column.
# Lengths are shares of the lower mast (cap over deck, r304's read off the same plate), so the
# result does not depend on the plate's contested scale.
import sys, json
import numpy as np
from PIL import Image, ImageFilter
im = np.asarray(Image.open(sys.argv[1]).convert('L').filter(ImageFilter.GaussianBlur(1.2))).astype(float)
#            seed throat     seed peak     visible cols    cap rail row, cap over deck px (r304)
seeds = {'main':   ((2770, 532), (2829, 494), (2775, 2831), 630, 146.7),
         'mizzen': ((2920, 540), (2980, 495), (2922, 2982), 645, 154.7)}
out = {}
for name, ((x0, y0), (x1, y1), (ca, cb), rail, capPx) in seeds.items():
    cs, rs, dips = [], [], []
    for c in range(ca, cb + 1):
        ys = y0 + (y1 - y0) * (c - x0) / (x1 - x0); r0 = int(round(ys)) - 6
        col = im[r0:r0 + 13, c]; k = int(np.argmin(col))
        sky = np.median(np.r_[im[r0 - 14:r0 - 6, c], im[r0 + 19:r0 + 27, c]])
        cs.append(c); rs.append(r0 + k); dips.append(sky - col[k])
    cs, rs, dips = map(np.array, (cs, rs, dips))
    a, b = np.polyfit(cs, rs, 1, w=np.clip(dips, 0.5, None))
    res = rs - (a * cs + b)
    # the mast's axis: darkest column of the pole a little under the throat
    rowT = int(round(a * ca + b)) + 12
    seg = im[rowT, ca - 20:ca + 2]; mastC = ca - 20 + int(np.argmin(seg))
    yT = a * mastC + b; yP = a * cb + b
    L = float(np.hypot(cb - mastC, yP - yT)); deck = rail + 16.7
    out[name] = {'mastAxisCol': mastC, 'throat': [mastC, round(float(yT), 1)], 'peak': [cb, round(float(yP), 1)],
                 'lengthPx': round(L, 1), 'angleDeg': round(float(np.degrees(np.arctan(-a))), 1),
                 'fitResidualPx': round(float(np.sqrt(np.mean(res ** 2))), 2), 'meanDip': round(float(dips.mean()), 1),
                 'throatOverDeckPx': round(float(deck - yT), 1), 'capOverDeckPx': capPx,
                 'gaffFrac': round(L / capPx, 3), 'throatFrac': round(float((deck - yT) / capPx), 3),
                 'endBoundPx': 3, 'fracBound': round(3 * 2 ** 0.5 / capPx, 3)}
    print(name, out[name])
json.dump(out, open(sys.argv[2], 'w'), indent=1)

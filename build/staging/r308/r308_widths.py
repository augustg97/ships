"""Width of the dark column at each mast of the beset broadside, per row band: pixels darker than
the local sky by > 25 grey levels, in a 40-px window about the mast's axis (fitted per row as the darkest column)."""
from PIL import Image
import numpy as np, json
im = np.asarray(Image.open('build/hurley-broadside.png').convert('L')).astype(float)
def width(col0, r0, r1):
    out = []
    for r in range(r0, r1):
        row = im[r, col0-20:col0+21]
        sky = np.median(np.r_[im[r, col0-45:col0-25], im[r, col0+25:col0+45]])
        out.append(int((row < sky - 25).sum()))
    return float(np.median(out)), len(out)
res = {}
# mizzen: axis 2914 at the jaws (row 548), cap ~507, rail 645; topmast above row 500
res['mizzen_topmast_430_495'] = width(2916, 430, 495)
res['mizzen_lower_555_625'] = width(2912, 555, 625)
res['main_topmast_430_490'] = width(2768, 430, 490)
res['main_lower_550_615'] = width(2764, 550, 615)
print(json.dumps(res, indent=1))

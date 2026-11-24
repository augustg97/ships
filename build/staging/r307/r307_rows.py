# r307: rows of each wash port's top and bottom edges, against the well's bulwark line, sub-pixel
import json, numpy as np
from PIL import Image
im = np.array(Image.open('../r295/plates/side-plan-1911.png').convert('L')).astype(float)
wells = json.load(open('../r303/wells.json')); raw = json.load(open('ports-raw.json'))
PX = 13.0268
res = []
for w, rw in zip(wells, raw):
    ca, cb = w['cols']; ra, rb = w['topRead']['rows']; da, db = w['topRead']['datumRows']
    lin = lambda c, a, b: a + (b - a) * (c - ca) / (cb - ca)
    ports = []
    for s in rw['spans']:
        a, b = s['cols']
        if s['bottomDark'] > 60: continue            # the gap between two ports: no bottom edge
        cols = np.arange(int(a) + 4, int(b) - 3)
        lineLow, botC, lineHigh = [], [], []
        for c in cols:
            t = int(round(lin(c, ra, rb))); col = 255 - im[t - 8:t + 20, c]   # darkness
            dark = col > 128
            # the top line: the dark run containing row t
            i = 8
            while i + 1 < len(dark) and dark[i + 1]: i += 1
            j = 8
            while j - 1 >= 0 and dark[j - 1]: j -= 1
            lineHigh.append(t - 8 + j - 0.5); lineLow.append(t - 8 + i + 0.5)
            # the bottom edge: darkness-weighted centre of the dark run below the line
            k = i + 2
            while k < len(dark) and not dark[k]: k += 1
            m = k
            while m < len(dark) and dark[m]: m += 1
            ww = col[k:m]; botC.append(t - 8 + float((np.arange(k, m) * ww).sum() / ww.sum()))
        cm = (a + b) / 2; datum = lin(cm, da, db)
        lh, ll, bc = np.median(lineHigh), np.median(lineLow), np.median(botC)
        p = dict(cols=[a, b], lenM=round((b - a) / PX, 2), lineTopRow=round(float(lh), 2),
                 lineUnderRow=round(float(ll), 2), bottomRow=round(float(bc), 2), datumRow=round(float(datum), 2),
                 lineThickM=round(float(ll - lh) / PX, 3),
                 openTopM=round(float(datum - ll) / PX, 2), openBottomM=round(float(datum - bc) / PX, 2),
                 lineTopM=round(float(datum - lh) / PX, 2),
                 u=[round(w['u'][0] + (w['u'][1] - w['u'][0]) * (c - ca) / (cb - ca), 4) for c in (a, b)])
        p['u'] = sorted(p['u'])
        ports.append(p); print(w['name'], p)
    res.append(dict(name=w['name'], ports=ports))
json.dump(res, open('ports.json', 'w'), indent=1)

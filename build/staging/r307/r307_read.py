# r307: read the wash-port rectangles under the well bulwark line on the 1911 side plan
import json, numpy as np
from PIL import Image
im = np.array(Image.open('../r295/plates/side-plan-1911.png').convert('L')).astype(float)
wells = json.load(open('../r303/wells.json'))
out = []
for w in wells:
    c0, c1 = sorted(w['cols']); r = w['topRead']
    # bulwark-top row, linear in column between the two well ends
    ca, cb = w['cols']; ra, rb = r['rows']
    top = lambda c: ra + (rb - ra) * (c - ca) / (cb - ca)
    cols = np.arange(int(c0) + 3, int(c1) - 2)
    # a vertical edge: dark through rows top+4 .. top+9
    dark_v = np.array([ (im[int(round(top(c)))+4:int(round(top(c)))+10, c] < 110).mean() for c in cols])
    edges = cols[dark_v > 0.8]
    # group adjacent edge columns
    groups = []
    for c in edges:
        if groups and c - groups[-1][-1] <= 2: groups[-1].append(c)
        else: groups.append([c])
    ecent = [float(np.mean(g)) for g in groups]
    # bottom row of each span between consecutive edges: darkest row 4..16 under top, mean across span interior
    spans = []
    for a, b in zip(ecent[:-1], ecent[1:]):
        mid = np.arange(int(a) + 3, int(b) - 2)
        if len(mid) < 5: continue
        prof = []
        for dr in range(3, 18):
            prof.append(np.mean([im[int(round(top(c))) + dr, c] for c in mid]))
        prof = np.array(prof); k = int(np.argmin(prof))
        spans.append(dict(cols=[round(a, 1), round(b, 1)], bottomDr=3 + k, bottomDark=round(float(prof[k]), 1),
                          interior=round(float(np.median(prof)), 1)))
    out.append(dict(name=w['name'], edges=ecent, spans=spans))
    print(w['name'], 'edges', [round(e, 1) for e in ecent])
    for s in spans: print('  ', s)
json.dump(out, open('ports-raw.json', 'w'), indent=1)

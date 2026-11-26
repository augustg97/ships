"""r334 (0y175, the rest): the fluyt's sheer read off Hollar's 1647 plate as hull.sheerRead.
usage: r334_edit.py <dir holding data/vessels.json and audit-hulls.js>   (every replace asserted)"""
import json, sys
import numpy as np
D = sys.argv[1]
T = json.load(open('/Users/augustgweon/Ships/build/staging/r334/rail-trace.json'))
c0, st, raw = T['fromCol'], T['stepCol'], np.array(T['rows'], float)
tc = c0 + st * np.arange(len(raw))
PX = 777 / 21.53                     # 36.09 px/m, r329's plate scale (the fore-to-mizzen span)
FORE_C, MIZ_C = 724, 1501
xFore, xMiz = -11.499, 10.029        # r333 probe: the built fore's and mizzen's feet, hull space
p = f'{D}/data/vessels.json'; d = json.load(open(p))
v = [x for x in d['vessels'] if x['id'] == 'fluyt'][0]; H = v['hull']
assert 'sheerRead' not in H and H['freeboard'] == 3.0
rs = min(1, max(0, H['loa'] - H['lwl']) / ((H['stemRake'] + H['sternRake']) * H['loa']))
def xdeck(u):
    r = 0
    if u < H['forefoot']: k = (H['forefoot'] - u) / H['forefoot']; r = -H['stemRake'] * rs * k * k * H['loa']
    elif u > 1 - H['run']: k = (u - (1 - H['run'])) / H['run']; r = H['sternRake'] * rs * k * k * H['loa']
    return (u - 0.5) * H['lwl'] + r
assert abs(xdeck(0.115) - xFore) < 0.01 and abs(xdeck(0.85) - xMiz) < 0.01
col = lambda u: FORE_C + (xdeck(u) - xFore) * PX
trace_at = lambda c: float(np.interp(c, tc, raw))
MAINC = 1143
datumRow = round(float(np.median(raw[np.abs(tc - MAINC) <= 12])), 2)
BREAK = (1210, 1220)                    # the last waist column and the first quarterdeck column either side of the break
xinv = lambda c: xFore + (c - FORE_C) / PX
def uinv(c):                            # the deck line is linear in u between the forefoot and the run
    u = 0.5 + xinv(c) / H['lwl']; assert H['forefoot'] < u < 1 - H['run']; return round(u, 4)
us = [round(0.05 * i, 2) for i in range(21)]
us = sorted([u for u in us if all(abs(col(u) - b) > 10 for b in BREAK)] + [uinv(b) for b in BREAK])
cols = [round(col(u), 1) for u in us]
rows = []
for c in cols:
    cc = min(max(c, tc[0]), tc[-1])          # beyond the trace each end holds its end value
    near = raw[np.abs(tc - cc) <= 12]          # the median of the 5 trace points within 12 columns
    rows.append(round(float(np.median(near)), 2))
datumM = 3.0
stations = [[u, round(datumM + (datumRow - r) / PX, 2)] for u, r in zip(us, rows)]
for (u, m), c, r in zip(stations, cols, rows): print(u, c, r, m, round(r - trace_at(min(max(c, tc[0]), tc[-1])), 2))
H['sheerRead'] = {
  'stations': stations, 'rows': rows, 'datumRows': [datumRow] * len(rows), 'datumM': datumM, 'pxPerM': round(PX, 4),
  'cols': cols, 'colRange': [int(tc[0]), int(tc[-1])], 'rmsPx': None,
  'trace': {'fromCol': int(tc[0]), 'stepCol': st, 'rows': [int(r) for r in raw], 'maxStepRows': 8, 'stationWindowCols': 12,
            'breaks': [{'col': 1215, 'why': 'the quarterdeck rail rises off the waist rail: Hollar draws its forward end as a post at column 1213'},
                       {'col': 1220, 'why': 'the same break, the second step of it'}],
            'breakStations': [uinv(b) for b in BREAK]},
  'read': 'build/staging/r334/r334_rail2.py (guided trace) and r334_edit.py',
  'provenance': (
    "PLATE READ, r334 (0y¹⁷⁵): the top of the side, the rail cap, off Wenceslaus Hollar, 'Navis Mercatoria Hollandica, vulgo VLIET', "
    "etching, 1647 (Wikimedia Commons File:Wenceslas Hollar - A Flute (State 2).jpg, the 1920 px thumbnail, build/staging/r328/dl/hollar-flute.jpg, "
    "bow at the left). Rows were hand-read off gridded crops at 19 columns from the stem head (740) to the taffrail (1720); every 5 columns the trace "
    "took the strongest light-over-dark edge, the median of 11 columns, within 3 rows of that line (197 points, stored in trace). Each station's row is the median of the 5 trace points within 12 columns of its column. Stays, shrouds and "
    "the crew standing at the rail cross it, so the raw rows scatter by up to 8 rows from one point to the next (0.22 m); the steepest real slope is "
    "about 3 rows a step, at the taffrail. The one larger step is a real break: the quarterdeck rail rises 16 rows off the waist rail between columns 1210 and 1220, and a pair of stations stands either side of it (breakStations), so the built deck ramps over those 0.28 m and nowhere else. "
    f"Columns map to u through r329's frame for this plate: the fore's foot at column 724 is the built fore's (x {xFore}), the mizzen's at 1501 the "
    f"built mizzen's (x {xMiz}), at {PX:.2f} px/m, through the loft's deck line. Heights are read at the same scale over the rail at the main's foot "
    f"(row {datumRow}, column 1143), which stands at the record's freeboard, {datumM} m: the waterline is hidden by Hollar's waves, so the freeboard "
    "is the record's, not a read, and only the rise is the plate's. The rail rises 0.9 m to the stem head and 3.6 m to the taffrail; at the mizzen's "
    "foot it stands 1.8 m over the waist, the same row r329 read for that foot (868). Until r334 the sheer was the class curve, sheerBow 1.2 and "
    "sheerStern 0.9 with the rise held to the outer sixth, so the mizzen's foot stood 0.33 m over the waist. BOUNDS: (1) the model's bow is about "
    "5 m longer before the fore than the plate's (0y¹⁷⁹), so every station forward of column 740 (u 0 to 0.10) holds the stem head's row. "
    "(2) The rise abaft column 1215 is the quarterdeck's rail as well as the hull's sheer; the model has no quarterdeck, so it draws the whole rise "
    "as sheer, and the break at 1215 as a ramp 0.28 m long. (3) Hollar's eye is about 2 m over the water and the rail stands above it, so the "
    "farther stern is drawn lower than it stands: the rise aft is if anything understated. (4) The vertical scale is r329's, taken off the masts' "
    "spacing; the plate's hull length gives 31.4 px/m, which would make every rise 15% larger.")}
H['sheerProvenance'] = ("sheerBow and sheerStern are class figures, superseded since r334 by sheerRead, which the builder draws in their place.")
fit_res = [abs(r - trace_at(c)) for r, c in zip(rows, cols) if tc[0] <= c <= tc[-1]]
H['sheerRead']['rmsPx'] = round(float(np.sqrt(np.mean(np.square(fit_res)))), 2) if fit_res else 0
open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('datumRow', datumRow, 'written', p)

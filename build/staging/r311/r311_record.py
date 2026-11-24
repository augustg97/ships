# r311 (0y141): store the raw traces behind Titanic's island-top reads (r298) and well-top reads (r303)
# in the record, with the fit each read used. The wells are refitted on whole-band columns only: at each
# well's end next to the house the heavy bulwark line thins to 2 rows where the house's line takes over,
# and r303's trace stepped onto it (after well 754-760, 3 rows; forward well 2932).
import json, sys, numpy as np
VJ = sys.argv[1]
d = json.load(open(VJ)); o = json.load(open('retrace.json'))
PX = 3505.5/269.1
def WL(c): return 845-25*(c-123.5)/3505.5
h = next(x for x in d['vessels'] if x['id'] == 'titanic')['hull']
r1 = lambda x: round(float(x), 1)
for isl in h['islands']['list']:
    t = o[isl['name']]; k = t['fitCoef']; TR = isl['topRead']
    keepAt = dict(zip(t['colsFound'], t['keep']))
    rows = [None if (rr is None or not keepAt.get(t['fromCol'] + i*t['stepCol'], False)) else rr for i, rr in enumerate(t['rows'])]
    rej = [t['fromCol'] + i*t['stepCol'] for i, rr in enumerate(t['rows']) if rr is not None and rows[i] is None]
    fitRows = [float(np.polyval(k, c)) for c in isl['cols']]
    assert all(abs(a - b) < 0.15 for a, b in zip(fitRows, TR['rows'])), (isl['name'], fitRows, TR['rows'])
    TR['trace'] = dict(fromCol=t['fromCol'], stepCol=t['stepCol'], rows=rows, maxStepRows=1.5, fit=k,
        what="the bottom row of the open-rail band at every 4th column (5-column mean), as r298_read.py reads it; null where the fit rejected the point",
        rejected=rej, read='build/staging/r311/r311_retrace.py re-ran r298_read.py and kept every column')
    print(isl['name'], 'trace', len(rows), 'rejected', rej, 'rows', TR['rows'], 'fit at ends', [round(x, 2) for x in fitRows])
for w in h['islands']['wells']:
    t = o[w['name']]; c0, c1 = t['used']
    pts = [q for q in t['pts'] if c0 <= q[0] <= c1]
    med = float(np.median([q[2]-q[1]+1 for q in pts]))
    good = [q for q in pts if q[2]-q[1]+1 >= med-1]
    c = np.array([q[0] for q in good], float); m = np.array([q[3] for q in good])
    k = np.polyfit(c, m, 1); res = m - np.polyval(k, c); rms = float(np.sqrt(np.mean(res**2)))
    rows = [r1(np.polyval(k, cc)) for cc in w['cols']]; dat = w['topRead']['datumRows']
    top = [round((dr - r)/PX, 2) for dr, r in zip(dat, rows)]
    goodc = {q[0] for q in good}
    TR = w['topRead']; old = (list(TR['rows']), list(w['topM']), TR['rmsPx'], TR['n'], TR['colRange'])
    TR['rows'] = rows; w['topM'] = top; TR['rmsPx'] = round(rms, 2); TR['n'] = len(good)
    TR['colRange'] = [int(c.min()), int(c.max())]
    step = pts[1][0] - pts[0][0]
    TR['trace'] = dict(fromCol=pts[0][0], stepCol=step, rows=[q[3] if q[0] in goodc else None for q in pts],
        thickRows=[int(q[2]-q[1]+1) for q in pts], maxStepRows=1.5, fit=[float(x) for x in k],
        what="the centre row of the heavy bulwark line at every 3rd column (7-column mean), each point within 4 rows of the last, as r303_trace.py traces it; null where the line is under %d rows thick, the band's median less one" % int(med - 1),
        rejected=[q[0] for q in pts if q[0] not in goodc], read='build/staging/r311/r311_retrace.py re-ran r303_trace.py; r311_record.py refitted it')
    TR['read'] = 'build/staging/r303/r303_trace.py, r303_read.py; refitted in r311 on whole-band columns (build/staging/r311/r311_record.py)'
    print(w['name'], 'rows', old[0], '->', rows, 'topM', old[1], '->', top, 'rms', old[2], '->', TR['rmsPx'], 'n', old[3], '->', len(good), 'colRange', old[4], '->', TR['colRange'], 'dropped', TR['trace']['rejected'])
add = (" r311 stored each well's raw trace in topRead.trace and refitted both on columns where the line is whole. At the after"
       " well's house end, columns 754 to 760, the heavy line ends and r303's trace stepped 3 rows down onto the house's own 2-row"
       " line. At the forward well's house end, column 2932, the line thins to 2 rows where it meets the house. Dropping those"
       " four points moves each end's top by 0.01 m or less (r303 read 11.84 and 11.40 m forward, 11.29 and 11.58 m aft), and"
       " the fits' rms falls from 0.32 and 0.35 px to %.2f and %.2f px.") % tuple(w['topRead']['rmsPx'] for w in h['islands']['wells'])
P = h['islands']['wellsProvenance']
if 'r311 stored' not in P:
    fw, aw = h['islands']['wells']
    for a, b in [("the forward well's top falls from 11.84 m at the forecastle break to 11.40 m at the house",
                  "the forward well's top falls from %.2f m at the forecastle break to %.2f m at the house" % tuple(fw['topM'])),
                 ("the after well's rises from 11.29 m at the house to 11.58 m at the poop",
                  "the after well's rises from %.2f m at the house to %.2f m at the poop" % tuple(aw['topM']))]:
        a = a[0].upper() + a[1:] if a.startswith("the forward") else a
        b = b[0].upper() + b[1:] if b.startswith("the forward") else b
        assert a in P, a; P = P.replace(a, b)
    h['islands']['wellsProvenance'] = P + add
open(VJ + ".tmp", "w", encoding="utf8").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n"); import os; os.replace(VJ + ".tmp", VJ)

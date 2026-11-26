"""r337 (0y180): the fluyt's main wale laid on the seam Hollar's 1647 plate draws, as hull.waleRead.
usage: r337_edit.py <dir holding data/vessels.json, js/hull.js and audit-hulls.js>   (every replace asserted)"""
import json, sys
import numpy as np
D = sys.argv[1]
T = json.load(open('/Users/augustgweon/Ships/build/staging/r337/seam-trace.json'))
c0, st, raw = T['fromCol'], T['stepCol'], np.array(T['rows'], float)
tc = c0 + st * np.arange(len(raw))
PX = 777 / 21.53
FORE_C = 724; xFore = -11.499
p = f'{D}/data/vessels.json'; d = json.load(open(p))
v = [x for x in d['vessels'] if x['id'] == 'fluyt'][0]; H = v['hull']
assert 'waleRead' not in H and 'sheerRead' in H
SR = H['sheerRead']; datumRow = SR['datumRows'][0]; datumM = SR['datumM']
assert abs(SR['pxPerM'] - round(PX, 4)) < 1e-6
rs = min(1, max(0, H['loa'] - H['lwl']) / ((H['stemRake'] + H['sternRake']) * H['loa']))
def xdeck(u):
    r = 0
    if u < H['forefoot']: k = (H['forefoot'] - u) / H['forefoot']; r = -H['stemRake'] * rs * k * k * H['loa']
    elif u > 1 - H['run']: k = (u - (1 - H['run'])) / H['run']; r = H['sternRake'] * rs * k * k * H['loa']
    return (u - 0.5) * H['lwl'] + r
col = lambda u: FORE_C + (xdeck(u) - xFore) * PX
W = 12
us = [round(0.05 * i, 2) for i in range(21)]
cols = [round(col(u), 1) for u in us]
rows = []
for c in cols:
    cc = min(max(c, tc[0]), tc[-1])
    near = np.sort(raw[np.abs(tc - cc) <= W]); rows.append(round(float(np.median(near)), 2))
stations = [[u, round(datumM + (datumRow - r) / PX, 2)] for u, r in zip(us, rows)]
for (u, m), c, r, (_, s) in zip(stations, cols, rows, SR['stations']): print(u, c, r, m, 'rail', s, 'rail-wale', round(s - m, 2))
steps = np.abs(np.diff(raw)); assert steps.max() <= 1
depth = round(0.026 / 0.38 * H['freeboard'], 3)
H['waleRead'] = {
  'stations': stations, 'rows': rows, 'datumRows': [datumRow] * len(rows), 'datumM': datumM, 'pxPerM': round(PX, 4), 'cols': cols,
  'depthM': depth,
  'trace': {'fromCol': int(tc[0]), 'stepCol': st, 'rows': [int(r) for r in raw], 'maxStepRows': 1, 'stationWindowCols': W},
  'read': 'build/staging/r337/r337_seam2.py (the trace) and r337_edit.py',
  'provenance': (
    "PLATE READ, r337 (0y¹⁸⁰): the seam under the channels, off Wenceslaus Hollar, 'Navis Mercatoria Hollandica, vulgo VLIET', etching, 1647 "
    "(build/staging/r328/dl/hollar-flute.jpg, 1920 px, bow at the left, 36.09 px/m). It is the one planking line on the plate that runs from the bow to the "
    "tuck at the stern: it starts at row 967 in the waist, column 900, 34 rows (0.94 m) under the rail, and the trace follows the darkest path from there "
    "every 2 columns, the median of 7 columns, moving at most one row a step (473 points, columns 746 to 1690, stored in trace). Each station's row is the "
    "median of the trace points within 12 columns. Columns map to u and rows to metres exactly as hull.sheerRead does (r334): the rail at the main's foot, "
    f"row {datumRow}, stands at the record's freeboard, {datumM} m over the load waterline. The seam is level along the waist at 2.06 m and rises 0.86 m "
    "to the mizzen's foot and 2.2 m to the end of the trace at the tuck, where the rail rises 1.8 m and 3.4 m: the hull's planking rises aft about half as "
    "much as the rail, and the band between them widens from 0.9 m at the main to 2.1 m at the tuck. The model's main wale is laid centred on this "
    "line, in place of the class wale at 37% of the freeboard, which rose in proportion to the rail. BOUNDS: at 36 px/m the plate does not resolve "
    "whether the dark line is a wale or the seam at a wale's edge, so the band's depth stays the class figure (depthM). Forward of column 830 the line "
    "runs through the shading of the bow under the anchor, and abaft column 1600 through the shading of the stern, so those stations rest on the darkest "
    "path through shading, not on a line seen clearly. Stations forward of column 746 (u 0 to 0.10) and abaft column 1690 (u 1.0) hold the trace's "
    "end rows. The lower class wale near the waterline is not read: Hollar's waves cover it.")}
open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')

# ── builder ──
hp = f'{D}/js/hull.js'; h = open(hp).read()
a1 = """function buildWaleGeometry(S, v0, thick) {
  const H = hullSurface(S);"""
b1 = """function buildWaleGeometry(S, v0, thick, vAt) {
  const H = hullSurface(S);"""
assert h.count(a1) == 1; h = h.replace(a1, b1)
a2 = """        const p = surfacePoint(S, H, u, v0 + k * 0.5 * thick);
        const out = 1.018;                       // proud of the planking"""
b2 = """        const p = surfacePoint(S, H, u, vAt ? vAt(u) + k * vAt.halfV(u) : v0 + k * 0.5 * thick);
        const out = 1.018;                       // proud of the planking"""
assert h.count(a2) == 1; h = h.replace(a2, b2)
a3 = """/* ── STEERING IS A FACT OF THE RECORD (round 121)"""
b3 = """/* ── A READ WALE IS LAID ON ITS PLATE'S LINE (round 337) ─────────────────────────────
   The class wales stand at a fixed fraction of the freeboard (v 0.655 and 0.760), so they
   rise aft in proportion to the rail. On the fluyt that drew her main wale climbing with the
   rail to her taffrail. Hollar's 1647 plate draws her planking rising aft about half as much
   as the rail: the band between the rail and the seam under the channels widens from 0.94 m
   at the main to 2.1 m at the tuck. hull.waleRead { stations: [[u, metres over the load
   waterline]], depthM } lays the main wale centred on that line. v is found at each station
   from the height (above v 0.62 surfacePoint's height is linear in v, 0 at the waterline
   and the sheer at v 1). Without the field, the class wale, byte-identical. */
function readWaleV(S, H) {
  const W = S.waleRead;
  if (!(W && Array.isArray(W.stations) && W.stations.length >= 2)) return null;
  const hAt = pchip(W.stations.map(([u, r]) => ({ u, r })));
  const d = W.depthM > 0 ? W.depthM : 0.026 / 0.38 * S.freeboard;
  const fb = u => Math.max(0.5, H.sheer(u));
  const vAt = u => 0.62 + 0.38 * hAt(u) / fb(u);
  vAt.halfV = u => 0.38 * (d / 2) / fb(u);
  vAt.hAt = hAt;
  return vAt;
}

/* ── STEERING IS A FACT OF THE RECORD (round 121)"""
assert h.count(a3) == 1; h = h.replace(a3, b3)
a4 = """      group.add(tag(new THREE.Mesh(buildWaleGeometry(S, 0.760, 0.026), waleMat), 'wale'));"""
b4 = """      const rv = readWaleV(S, hullSurface(S));
      const mw = tag(new THREE.Mesh(buildWaleGeometry(S, 0.760, 0.026, rv), waleMat), 'wale');
      if (rv) mw.userData.waleRead = true;
      group.add(mw);"""
assert h.count(a4) == 1; h = h.replace(a4, b4)
a5 = "window.SHIPS_HULL = { PARTS, "
b5 = "window.SHIPS_HULL = { PARTS, readWaleV, "
assert h.count(a5) == 1; h = h.replace(a5, b5)
open(hp, 'w').write(h)

# ── audit ──
ap = f'{D}/audit-hulls.js'; A = open(ap).read()
a6 = """    if (part.container || part.forecast) {
      const H2 = SHIPS_HULL.hullSurface(H);"""
b6 = """    /* ── A-WALE-READ (round 337, the fluyt): A READ WALE IS ITS PLATE'S ROWS, ON ONE LINE, AND THE BUILT WALE.
       The class wales rise aft in proportion to the rail, and Hollar's plate draws the fluyt's planking rising
       about half as much. On a hull whose record carries waleRead: (1) every station's height must be datumM +
       (datumRow - row) / pxPerM within 0.05 m; (2) no two neighbouring trace points may differ by more than
       maxStepRows (a larger step is a jump to another seam); (3) every station inside the trace must stand
       within 2 px of the median of the trace points within stationWindowCols of its column; (4) exactly one
       'wale' mesh carries userData.waleRead, and at each station from u 0.05 to 0.95 the mean height of its
       port-side vertices within 0.25 m of the station's x stands within 0.10 m of the read. Silent without
       waleRead; a waleRead missing any field is convicted. */
    if (H.waleRead) {
      const WR = H.waleRead, ST = WR.stations, TR = WR.trace;
      if (!(Array.isArray(ST) && ST.length >= 2 && Array.isArray(WR.rows) && WR.rows.length === ST.length && Array.isArray(WR.datumRows) && WR.datumRows.length === ST.length
            && Array.isArray(WR.cols) && WR.cols.length === ST.length && WR.pxPerM > 0 && typeof WR.datumM === 'number'
            && TR && Array.isArray(TR.rows) && TR.rows.length >= 2 && TR.stepCol && TR.maxStepRows > 0 && TR.stationWindowCols > 0))
        say(v.id, 'a wale read with no rows', 'hull.waleRead needs stations, rows, datumRows and cols of one length, datumM, pxPerM and trace {fromCol, stepCol, rows, maxStepRows, stationWindowCols}');
      else {
        ST.forEach(([u, m], j) => {
          const want = WR.datumM + (WR.datumRows[j] - WR.rows[j]) / WR.pxPerM;
          if (Math.abs(m - want) > 0.05) say(v.id, 'a wale station off its plate read', `u ${u}: ${m} m, the plate's row ${WR.rows[j]} over datum row ${WR.datumRows[j]} reads ${want.toFixed(2)} m`);
        });
        let worst = 0, at = null;
        for (let i = 1; i < TR.rows.length; i++) { const dd = Math.abs(TR.rows[i] - TR.rows[i - 1]); if (dd > worst) { worst = dd; at = TR.fromCol + i * TR.stepCol; } }
        if (worst > TR.maxStepRows) say(v.id, 'a wale trace that steps onto another line', `the trace steps ${worst} rows at column ${at}, over its limit of ${TR.maxStepRows}`);
        const lastCol = TR.fromCol + (TR.rows.length - 1) * TR.stepCol;
        ST.forEach(([u], j) => {
          const c = WR.cols[j]; if (!(c >= TR.fromCol && c <= lastCol)) return;
          const nb = TR.rows.filter((_, k) => Math.abs(TR.fromCol + k * TR.stepCol - c) <= TR.stationWindowCols).sort((x, y) => x - y);
          if (!nb.length) return;
          const md = nb.length % 2 ? nb[(nb.length - 1) / 2] : (nb[nb.length / 2 - 1] + nb[nb.length / 2]) / 2;
          if (Math.abs(WR.rows[j] - md) > 2.0) say(v.id, 'a wale station off its own trace', `u ${u}: the station's row ${WR.rows[j]} is ${(WR.rows[j] - md).toFixed(2)} px off the trace's ${md} at column ${c}`);
        });
        const read = []; g.updateMatrixWorld(true);
        g.traverse(o => { const pt = tagOf(o); if (o.isMesh && pt && pt.key === 'wale' && o.userData.waleRead) read.push(o); });
        if (read.length !== 1) say(v.id, 'a read wale not drawn', `${read.length} wale meshes carry the read, where the record asks for one`);
        else {
          const HS = SHIPS_HULL.hullSurface(H), o = read[0], pa = o.geometry.attributes.position, P6 = new THREE.Vector3();
          ST.forEach(([u, m]) => {
            if (u < 0.05 || u > 0.95) return;
            const x = SHIPS_HULL.surfacePoint(H, HS, u, 0.62 + 0.38 * m / Math.max(0.5, HS.sheer(u)))[0];
            let sum = 0, n = 0;
            for (let i = 0; i < pa.count; i++) { P6.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); if (P6.z > 0 && Math.abs(P6.x - x) <= 0.25) { sum += P6.y; n++; } }
            if (!n || Math.abs(sum / n - m) > 0.10) say(v.id, 'a wale built off its read line', `u ${u}: the wale's port vertices within 0.25 m of x ${x.toFixed(2)} stand at ${n ? (sum / n).toFixed(2) : 'nothing'} m, the read ${m} m`);
          });
        }
      }
    }

    if (part.container || part.forecast) {
      const H2 = SHIPS_HULL.hullSurface(H);"""
assert A.count(a6) == 1; A = A.replace(a6, b6)
open(ap, 'w').write(A)
print('edited', D)

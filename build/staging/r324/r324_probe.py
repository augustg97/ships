"""r324: where each topsail and topgallant yard hangs on the East Indiaman and the slave ship, against the lower top and the topmast cap."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2]
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!['east-indiaman','slave-ship'].includes(v.id)) continue;
    const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
    g.updateMatrixWorld(true);
    const base = {}, ys = {};
    g.traverse(o => { if (o.isMesh && o.userData.courseAt) base[o.userData.courseAt.mast] = o.userData.courseAt.base; });
    g.traverse(o => { if (o.isMesh && o.userData.lowered && o.userData.slung) {
      const m = o.userData.lowered.mast; (ys[m] = ys[m] || []).push({ tie: o.userData.lowered.tie, axisY: o.userData.slung.axisY,
         read: o.userData.topsailAt || null }); } });
    const masts = [];
    v.hull.masts.forEach((mk, mi) => {
      const MH = mk.mastHeightsM; if (!MH || base[mi] === undefined) return;
      const lower = MH.top / 0.9, heel = 0.88 * lower, cap = MH.crosstrees;
      (ys[mi] || []).forEach(y => {
        const over = y.axisY - base[mi];
        masts.push({ mast: mi, tie: y.tie, overFoot: +over.toFixed(3), top: MH.top, cap, heel: +heel.toFixed(3),
          ofTopToCap: +((over - MH.top) / (cap - MH.top)).toFixed(4), ofTopmast: +((over - heel) / (cap - heel)).toFixed(4), read: y.read });
      });
    });
    out[v.id] = masts.sort((a, b) => a.mast - b.mast || a.tie - b.tie);
  }
  return out;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        pg = b.new_page(viewport={"width": 800, "height": 600})
        pg.goto(URL + "/?frozen=1#v=ship", wait_until="load", timeout=90000)
        pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
        res = pg.evaluate(JS)
    finally: b.close()
json.dump(res, open(OUT, 'w'), indent=1)
for k, r in res.items():
    print(k)
    for m in r: print('  ', json.dumps(m))

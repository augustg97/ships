"""r323: where each course yard hangs on the East Indiaman and the slave ship, and the course's foot."""
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
    const rows = [];
    const tops = [];
    g.traverse(o => { if (o.userData.part && o.userData.part.key === 'top') tops.push(o); });
    g.traverse(o => {
      if (!o.isMesh || !o.userData.courseAt) return;
      const c = o.userData.courseAt;
      const ax = o.userData.slung ? o.userData.slung.axisX : o.position.x;
      const t = tops.filter(q => q.parent === o.parent).sort((p, q) => Math.abs(p.position.x - ax) - Math.abs(q.position.x - ax))[0];
      rows.push({ mast: c.mast, from: c.from, frac: +c.frac.toFixed(4), yardOverFoot: +(o.position.y - c.base).toFixed(3),
                  topOverFoot: t ? +(t.position.y - c.base).toFixed(3) : null,
                  share: t ? +((o.position.y - c.base) / (t.position.y - c.base)).toFixed(4) : null });
    });
    const sails = [];
    g.traverse(o => { if (o.isMesh && o.userData.sail && o.userData.sail.tier === 0) { const bb = new THREE.Box3().setFromObject(o);
       sails.push({ mast: o.userData.sail.mast, top: +bb.max.y.toFixed(2), foot: +bb.min.y.toFixed(2) }); } });
    out[v.id] = { courses: rows.sort((a, b) => a.mast - b.mast), sails };
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
    for m in r['courses']: print('  ', json.dumps(m))
    for m in r['sails']: print('   sail', json.dumps(m))

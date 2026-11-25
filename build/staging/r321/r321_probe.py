"""r321: the mizzen lateen yard of the carrack, fluyt, East Indiaman and slave ship, set build."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2]
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!['carrack','fluyt','east-indiaman','slave-ship'].includes(v.id)) continue;
    const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
    g.updateMatrixWorld(true);
    const r = [];
    g.traverse(o => { if (!o.isMesh || !o.userData.lateen || o.userData.lateen.mast !== 2) return;
      const L = o.userData.lateen;
      const h = o.geometry.parameters.height;
      const a = new THREE.Vector3(0, -h/2, 0).applyMatrix4(o.matrixWorld), b = new THREE.Vector3(0, h/2, 0).applyMatrix4(o.matrixWorld);
      const lo = a.y < b.y ? a : b, hi = a.y < b.y ? b : a;
      r.push({ len: +h.toFixed(2), angleDeg: +(Math.atan2(hi.y - lo.y, Math.abs(hi.x - lo.x)) * 180 / Math.PI).toFixed(2),
        heel: [+lo.x.toFixed(2), +lo.y.toFixed(2)], peak: [+hi.x.toFixed(2), +hi.y.toFixed(2)],
        mastX: L.mastX, slingY: L.slingY, mastHeadY: L.mastHeadY, baseY: L.baseY, d2t: L.d2t, slingOfD2T: L.slingOfD2T,
        clew: L.clew, sheet: L.sheet, yardFrom: L.yardFrom });
    });
    out[v.id] = { L: v.hull.L || null, lateen: r };
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
    for y in r['lateen']: print(k, json.dumps(y))

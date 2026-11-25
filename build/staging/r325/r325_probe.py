"""r325: the topmast head of each three-tier mast on the East Indiaman and the slave ship: what is drawn there, where, how wide,
and where the topmast shrouds and topgallant shrouds end."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2]
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!['east-indiaman','slave-ship','fluyt'].includes(v.id)) continue;
    const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const box = o => { const b = new THREE.Box3().setFromObject(o).applyMatrix4(inv); return { x0: +b.min.x.toFixed(3), x1: +b.max.x.toFixed(3), y0: +b.min.y.toFixed(3), y1: +b.max.y.toFixed(3), z1: +b.max.z.toFixed(3) }; };
    const r = [];
    g.traverse(o => { const p = o.userData && o.userData.part; if (!p) return;
      if (p.key === 'top' && !o.isMesh) r.push({ name: p.name, mast: o.userData.topmastTop ? o.userData.topmastTop.mast : o.userData.mast, box: box(o), tt: o.userData.topmastTop || null });
      if (p.key === 'shroud' && /Topmast shrouds|Topgallant shrouds/.test(p.name)) r.push({ name: p.name, mast: o.userData.topmastShrouds ? o.userData.topmastShrouds.mast : null, box: box(o) });
    });
    out[v.id] = r;
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

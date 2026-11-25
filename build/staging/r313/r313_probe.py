"""r313: per-mast heights on the 74: every Yard/Top/Mast/Crosstrees/cap vertex, binned by mast x."""
import json, sys
from playwright.sync_api import sync_playwright
SHIP = sys.argv[1]; OUT = sys.argv[2]; URL = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8149'
JS = """
async (ship) => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const v = list.find(x => x.id === ship);
  const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
  g.updateMatrixWorld(true);
  const out = {};
  const want = /^(Yard|Top|Mast|Crosstrees|Brailed|Gaff|Boom|cap)/i;
  g.traverse(o => {
    if (!o.isMesh) return;
    let name = null, p = o;
    while (p) { if (p.userData && p.userData.part) { name = p.userData.part.name || p.userData.part.key; break; }
                if (p.name) { name = p.name; break; } p = p.parent; }
    if (!name || !want.test(name)) return;
    const pos = o.geometry.attributes.position; if (!pos) return;
    const arr = out[name] || (out[name] = []);
    const vv = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { vv.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      arr.push([+vv.x.toFixed(2), +vv.y.toFixed(2), +vv.z.toFixed(2)]); }
  });
  return {parts: out, masts: v.hull.masts.map(m => ({at: m.at, height: m.height})), loa: v.hull.loa, lwl: v.hull.lwl};
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        pg = b.new_page(viewport={"width": 800, "height": 600})
        pg.goto(URL + "/?frozen=1#v=ship&s=" + SHIP, wait_until="load", timeout=90000)
        pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
        res = pg.evaluate(JS, SHIP)
    finally: b.close()
json.dump(res, open(OUT, 'w'))
print({k: len(v) for k, v in res['parts'].items()})

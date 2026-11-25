import json, sys
from playwright.sync_api import sync_playwright
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const v = list.find(x => x.id === 'east-indiaman');
  const g = SHIPS_HULL.buildShip(v.hull, { fine: true }); g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(); const out = [];
  g.traverse(o => { if (!o.isMesh) return; const P = o.userData.part; if (!P || P.key !== 'mast') return;
    const bb = new THREE.Box3().setFromObject(o); if (bb.max.y - bb.min.y < 0.5) return;
    if (bb.min.x > 12 && bb.min.x < 20) out.push({ name: P.name, bb: [bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].map(a => +a.toFixed(3)), n: o.geometry.attributes.position.count }); });
  return out;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width": 800, "height": 600})
    pg.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=90000)
    pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
    for r in pg.evaluate(JS): print(r)
    b.close()

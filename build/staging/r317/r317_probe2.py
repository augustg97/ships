import json, sys
from playwright.sync_api import sync_playwright
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const v = list.find(x => x.id === 'east-indiaman');
  const g = SHIPS_HULL.buildShip(v.hull, { fine: true }); g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(); const out = [];
  g.traverse(o => { if (!o.isMesh) return;
    const sg = o.userData.seg, P = o.userData.part;
    const bb = new THREE.Box3().setFromObject(o); if (P && P.key === "mast" && bb.min.x < 17 && bb.max.x > 15 && bb.min.y < 14 && bb.max.y > 13) { out.push({bb:[bb.min.x,bb.min.y,bb.min.z,bb.max.x,bb.max.y,bb.max.z].map(a=>+a.toFixed(3)), name: P.name, n: o.geometry.attributes.position.count});
      const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(inv);
      out.push({ name: P ? P.key + ':' + P.name : '?', seg: sg ? sg.si : null, pos: [p.x, p.y, p.z].map(a => +a.toFixed(3)), rotz: +o.rotation.z.toFixed(4), parentZ: o.parent ? +o.parent.position.z.toFixed(3) : null, geo: o.geometry.type });
    }
  });
  return out;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width": 800, "height": 600})
    pg.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=90000)
    pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
    for r in pg.evaluate(JS): print(r)
    b.close()

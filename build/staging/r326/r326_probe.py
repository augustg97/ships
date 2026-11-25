"""r326 (0y168): every set square sail against every top on every hull. For each top's vertices, put them in the
sail's own frame, find the cloth at the same (x, y) through the sail's own surface(u, v), and report how far the
top stands forward of the cloth (positive = through the cloth)."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2]
JS = r"""
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!v.hull) continue;
    let g;
    try { g = SHIPS_HULL.buildShip(v.hull, { fine: true }); } catch (e) { out[v.id] = { err: String(e) }; continue; }
    g.updateMatrixWorld(true);
    const sails = [], tops = [];
    g.traverse(o => { const p = o.userData && o.userData.part; if (!p) return;
      if (p.key === 'sail' && o.isMesh && o.userData.kind === 'square' && o.userData.surface) sails.push(o);
      if (p.key === 'top' && !o.isMesh) tops.push(o);
    });
    const res = [];
    for (const s of sails) {
      const surf = s.userData.surface;
      const W = 2 * surf(1, 0)[0];
      const inv = new THREE.Matrix4().copy(s.matrixWorld).invert();
      const uOf = x => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (surf(m, 0)[0] < x) a = m; else b = m; } return (a + b) / 2; };
      for (const t of tops) {
        let worst = -1e9, at = null, n = 0, tested = 0;
        const p = new THREE.Vector3();
        t.traverse(m => { if (!m.isMesh) return; const pa = m.geometry.attributes.position;
          for (let i = 0; i < pa.count; i++) {
            p.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
            if (Math.abs(p.x) > W / 2 * 0.98) continue;
            const u = uOf(p.x), foot = surf(u, 1)[1];
            if (p.y > 0 || p.y < foot) continue;
            const vv = p.y / foot, cz = surf(u, vv)[2];
            tested++;
            const pen = cz - p.z;            // cloth z is negative forward; a vertex more negative stands before the cloth
            if (pen > 0) n++;
            if (pen > worst) { worst = pen; at = { u: +u.toFixed(3), v: +vv.toFixed(3), cz: +cz.toFixed(3) }; }
          } });
        if (!tested) continue;
        const tb = new THREE.Box3().setFromObject(t);
        res.push({ mastX: +(s.userData.mastX || 0).toFixed(2), yardY: +(s.userData.yardY || 0).toFixed(2), W: +W.toFixed(2), H: +(-surf(0, 1)[1]).toFixed(2),
                   top: t.userData.part.name, topY: +((tb.min.y + tb.max.y) / 2).toFixed(2), topR: +((tb.max.z - tb.min.z) / 2).toFixed(2),
                   tested, through: n, worst: +worst.toFixed(3), at });
      }
    }
    out[v.id] = res;
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
    if isinstance(r, dict): print(k, r); continue
    bad = [m for m in r if m['worst'] > 0]
    print(k, len(r), 'sail-top pairs in reach,', len(bad), 'through')
    for m in r: print('   ', 'THROUGH' if m['worst'] > 0 else 'clear  ', json.dumps(m))

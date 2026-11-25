"""r315: per square-rigged hull, set and furled fine builds: square cloths, their area, furled rolls, bare yards,
tack meshes, and every yard's built y on the aftermost mast."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8150'
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!v.hull || !(v.hull.masts || []).some(m => m.rig === 'square')) continue;
    const r = {};
    for (const furled of [false, true]) {
      const g = SHIPS_HULL.buildShip(v.hull, { fine: true, furled });
      g.updateMatrixWorld(true);
      let sq = 0, area = 0, furls = 0, tacks = 0; const bare = [], yards = [];
      g.traverse(o => { if (!o.isMesh) return;
        const ud = o.userData;
        if (ud.kind === 'square') { sq++; const p = o.geometry.attributes.position, idx = o.geometry.index;
          const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
          const n = idx ? idx.count : p.count; for (let i = 0; i < n; i += 3) { const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i+1) : i+1, c = idx ? idx.getX(i+2) : i+2;
            A.fromBufferAttribute(p, a); B.fromBufferAttribute(p, b); C.fromBufferAttribute(p, c);
            area += B.clone().sub(A).cross(C.clone().sub(A)).length() / 2; } }
        if (ud.kind === 'furl' && !ud.brailed) furls++;
        if (ud.part && ud.part.name && /^Tacks?$/.test(ud.part.name)) tacks++;
        if (ud.bare) bare.push(ud.bare);
        if (ud.slung) yards.push(+o.position.y.toFixed(2));
      });
      r[furled ? 'furled' : 'set'] = { sq, areaM2: +area.toFixed(1), furls, tacks, bare, yards: yards.sort((a, b) => a - b) };
    }
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
json.dump(res, open(OUT, 'w'), indent=0)
for k, r in res.items():
    s, f = r['set'], r['furled']
    print(f"{k:20s} set: {s['sq']:2d} cloths {s['areaM2']:7.1f} m2 tacks {s['tacks']} bare {len(s['bare'])} | furled: rolls {f['furls']:2d} tacks {f['tacks']} bare {len(f['bare'])}")

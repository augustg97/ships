"""r319: every lateen yard (userData.lateen): the clew (the cloth's aftmost vertex), the hull's aftmost structure
at and over the clew's height, and the poop's top at the stern; set build."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8149'
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  const RIG = new Set(['sail','yard','mast','shroud','stay','parrel','sheet','halyard','brace','lift','backstay','ratline','deadeye','outlicker','flag','pennant','bowline','tack','clewline','buntline','leechline']);
  for (const v of list) {
    if (!v.hull || !(v.hull.masts || []).some(m => m.rig === 'lateen' || m.lateenMizzen)) continue;
    const g = SHIPS_HULL.buildShip(v.hull, { fine: true, furled: false });
    g.updateMatrixWorld(true);
    const yards = [], cloths = [], hullPts = [], sheets = [], outl = [];
    const p = new THREE.Vector3();
    g.traverse(o => { if (!o.isMesh) return;
      const k = o.userData.part ? o.userData.part.key : '';
      const pos = o.geometry.attributes.position;
      if (o.userData.lateen) yards.push({ L: o.userData.lateen, o });
      if (o.userData.besideMast && o.userData.mastX !== undefined) {
        let best = null;
        for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          if (!best || p.x > best[0]) best = [p.x, p.y, p.z]; }
        cloths.push({ mastX: o.userData.mastX, clew: best.map(a => +a.toFixed(3)) });
      }
      if (k === 'sheet') sheets.push(o.name || 'sheet');
      if (k === 'outlicker') outl.push(o.userData.outlicker || {});
      if (!RIG.has(k) && k !== '' && !o.userData.besideMast) {
        const step = Math.max(1, Math.floor(pos.count / 4000));
        for (let i = 0; i < pos.count; i += step) { p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          hullPts.push([p.x, p.y, k]); }
      }
    });
    const r = { L: v.hull.L, lateens: [], sheets: sheets.length, outl };
    for (const c of cloths) {
      const y = yards.find(q => Math.abs(q.L.mastX - c.mastX) < 0.01);
      // the aftmost structure at heights from the clew down 3 m, and anywhere
      let aftAt = -1e9, aftAtK = '', aftAll = -1e9, aftAllK = '', topAft = -1e9;
      for (const [x, yy, k] of hullPts) {
        if (x > aftAll) { aftAll = x; aftAllK = k; }
        if (yy <= c.clew[1] + 0.5 && yy >= c.clew[1] - 4 && x > aftAt) { aftAt = x; aftAtK = k; }
      }
      for (const [x, yy, k] of hullPts) if (x > aftAll - 1.0 && yy > topAft) topAft = yy;
      r.lateens.push({ mastX: c.mastX, onSquare: y ? y.L.onSquareMast : null, clew: c.clew,
        aftNearClew: +aftAt.toFixed(3), aftNearClewK: aftAtK, aftAll: +aftAll.toFixed(3), aftAllK,
        topAtStern: +topAft.toFixed(3), past: +(c.clew[0] - aftAll).toFixed(3) });
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
    print('##', k, 'L', r['L'], 'sheets', r['sheets'], 'outlickers', len(r['outl']))
    for l in r['lateens']:
        print('  ', l)

# Builds Endurance in the page and prints every mast segment (mi, si, foot, head, radii), every square
# yard and every gaff, so before/after can be compared part by part.
import sys, time, json, os
from playwright.sync_api import sync_playwright
ship = sys.argv[1] if len(sys.argv) > 1 else 'endurance'
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.goto(os.environ.get('WURL', 'http://localhost:8149') + '/index.html?frozen=1#v=ship&s=' + ship)
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    out = pg.evaluate('''async ([ship]) => {
      const d = await (await fetch('/data/vessels.json')).json();
      const v = d.vessels.find(x => x.id === ship);
      const G = SHIPS_HULL.buildShip(v.hull, {fine: true});
      G.updateMatrixWorld(true);
      const res = {segs: [], yards: [], gaffs: [], rig: G.userData.rigTruckFrom || null};
      const bb = o => { o.geometry.computeBoundingBox(); const q = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); return [q.min.toArray().map(x=>+x.toFixed(2)), q.max.toArray().map(x=>+x.toFixed(2))]; };
      G.traverse(o => { if (!o.isMesh) return; const p = o.userData.part;
        if (o.userData.seg) { const s = o.userData.seg; const q = bb(o); res.segs.push({mi: s.mi, si: s.si, foot: +s.footY.toFixed(2), head: +s.headY.toFixed(2), w: +(q[1][2]-q[0][2]).toFixed(3)}); }
        if (p && p.key === 'yard') { const q = bb(o); (p.name === 'Gaff' ? res.gaffs : res.yards).push({name: p.name, min: q[0], max: q[1]}); } });
      res.segs.sort((a,b)=>a.mi-b.mi||a.si-b.si); res.yards.sort((a,b)=>a.min[1]-b.min[1]);
      return res;
    }''', [ship])
    print(json.dumps(out))
    b.close()

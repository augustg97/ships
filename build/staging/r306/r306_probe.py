# Builds every hull with a gaff in the page and prints each gaff mast: boom, gaff, the mast's
# station, the next mast aft and every funnel stack's x-extent and top, all in hull space.
import sys, time, json, os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.goto(os.environ.get('WURL', 'http://localhost:8149') + '/index.html?frozen=1#v=ship&s=endurance')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    out = pg.evaluate('''async () => {
      const d = await (await fetch('/data/vessels.json')).json();
      const all = {};
      for (const v of d.vessels) {
        if (!v.hull || !v.hull.masts || !v.hull.masts.some(m => m.rig === 'gaff' || m.spanker)) continue;
        const G = SHIPS_HULL.buildShip(v.hull, {fine: true});
        G.updateMatrixWorld(true);
        const res = {booms: [], gaffs: [], funnels: [], brailed: []};
        G.traverse(o => {
          if (o.userData.brailed) res.brailed.push(o.userData.brailed);
          if (o.userData.gaffBoom) { const q = o.userData.gaffBoom; res.booms.push({mastX: q.mastX, foot: q.foot, clew: q.clew, boomL: q.boomL}); }
          if (o.userData.gaff) { const q = o.userData.gaff; res.gaffs.push({mast: q.mast, origin: q.origin, deg: q.deg, L: q.lengthM, state: q.state, from: q.gaffFrom}); }
          if (o.isMesh && o.userData.part && o.userData.part.key === 'funnel') {
            const bb = new THREE.Box3().setFromObject(o);
            res.funnels.push({name: o.userData.part.name, x: [+bb.min.x.toFixed(2), +bb.max.x.toFixed(2)], top: +bb.max.y.toFixed(2)});
          }
        });
        all[v.id] = res;
      }
      return all;
    }''')
    print(json.dumps(out))
    b.close()

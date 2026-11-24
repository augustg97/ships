# Builds every gaff hull set and furled in the page; prints booms, gaffs, brailed bundles, furl rolls and the furled card.
import sys, time, json, os
from playwright.sync_api import sync_playwright
url, out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.goto(url + '/index.html?frozen=1#v=ship&s=endurance')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    res = pg.evaluate('''async () => {
      const d = await (await fetch('/data/vessels.json')).json();
      const all = {};
      for (const v of d.vessels) {
        if (!v.hull || !v.hull.masts || !v.hull.masts.some(m => m.rig === 'gaff' || m.spanker)) continue;
        for (const furled of [false, true]) {
          const G = SHIPS_HULL.buildShip(v.hull, {fine: true, furled});
          G.updateMatrixWorld(true);
          const r = {booms: [], gaffs: [], brailed: [], rolls: 0, lifts: 0};
          G.traverse(o => {
            if (!o.isMesh) return;
            if (o.userData.brailed) r.brailed.push(o.userData.brailed);
            else if (o.userData.kind === 'furl') r.rolls++;
            const pt = o.userData.part;
            if (o.userData.gaffBoom && pt && pt.name === 'Boom') { const q = o.userData.gaffBoom; r.booms.push({at: q.at, foot: q.foot, clew: q.clew, cock: q.cockDeg}); }
            if (o.userData.gaff) { const q = o.userData.gaff; r.gaffs.push({mast: q.mast, origin: q.origin, deg: q.deg, L: q.lengthM, state: q.state}); }
            if (pt && pt.key === 'toppingLift') r.lifts++;
          });
          all[v.id + (furled ? ':furled' : ':set')] = r;
        }
        if (window.SW_FURLED_CARD) all[v.id + ':card'] = SW_FURLED_CARD(v)[1];
      }
      return all;
    }''')
    json.dump(res, open(out, 'w'), indent=1)
    print('ok', len(res))
    b.close()

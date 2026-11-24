# Builds each gaff-topmast hull in the page and prints the r305 crosstrees and gaff topmast shrouds,
# with the topmast segment they belong to and the skin half-breadth at each foot.
import sys, time, json, os
from playwright.sync_api import sync_playwright
ships = sys.argv[1:] or ['endurance', 'wyoming', 'great-eastern', 'steamer']
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.goto(os.environ.get('WURL', 'http://localhost:8149') + '/index.html?frozen=1#v=ship&s=endurance')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    out = pg.evaluate('''async (ships) => {
      const d = await (await fetch('/data/vessels.json')).json();
      const all = {};
      for (const ship of ships) {
        const v = d.vessels.find(x => x.id === ship);
        const G = SHIPS_HULL.buildShip(v.hull, {fine: true});
        G.updateMatrixWorld(true);
        const res = {segs: [], ct: [], ts: []};
        G.traverse(o => {
          if (o.isMesh && o.userData.seg && o.userData.seg.si === 1) { const s = o.userData.seg; res.segs.push({mi: s.mi, foot: +s.footY.toFixed(2), head: +s.headY.toFixed(2), x: +s.headX.toFixed(2)}); }
          if (o.userData.gaffCrosstrees) res.ct.push(o.userData.gaffCrosstrees);
          if (o.userData.gaffTopShrouds) { const t = o.userData.gaffTopShrouds;
            res.ts.push({mi: t.mi, hounds: t.hounds, ct: t.ct, tmHead: t.tmHead, built: t.built.map(q => ({side: q.side, head: q.head.map(x=>+x.toFixed(2)), tip: q.tip.map(x=>+x.toFixed(2)), foot: q.foot.map(x=>+x.toFixed(2)), aft: q.aftShroudFoot.map(x=>+x.toFixed(2))}))}); }
        });
        all[ship] = res;
      }
      return all;
    }''', ships)
    print(json.dumps(out, indent=0))
    b.close()

import sys, time, json
from playwright.sync_api import sync_playwright
url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8149'
JS = """async () => {
  const d = await (await fetch('data/vessels.json?' + Date.now())).json();
  const out = {};
  for (const id of ['fluyt', 'carrack']) {
    const v = d.vessels.find(x => x.id === id);
    const g = SHIPS_HULL.buildShip(v.hull, {fine: true});
    g.updateMatrixWorld(true);
    const r = {tops: [], masts: [], lt: null, ltm: null, lts: null};
    g.traverse(o => {
      const ud = o.userData || {};
      if (ud.lateenTop) r.lt = ud.lateenTop;
      if (ud.lateenTopmast) r.ltm = ud.lateenTopmast;
      if (ud.lateenTopmastShrouds) r.lts = ud.lateenTopmastShrouds;
      const k = ud.part && ud.part.key; const nm = ud.part && ud.part.name;
      if (o.isMesh || o.isGroup) {
        const b = new THREE.Box3().setFromObject(o);
        if (k === 'top') r.tops.push({name: nm, mast: ud.mast, y0: +b.min.y.toFixed(2), y1: +b.max.y.toFixed(2), x: +((b.min.x+b.max.x)/2).toFixed(2)});
        if (k === 'mast' && o.isMesh) r.masts.push({x: +((b.min.x+b.max.x)/2).toFixed(2), y0: +b.min.y.toFixed(2), y1: +b.max.y.toFixed(2)});
      }
    });
    out[id] = r;
  }
  return out;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page()
    pg.goto(url + '/index.html?frozen#v=ship&s=fluyt')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    print(json.dumps(pg.evaluate(JS), indent=1))
    b.close()

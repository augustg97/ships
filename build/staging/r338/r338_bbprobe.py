import time, json, sys
from playwright.sync_api import sync_playwright
ship, out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True); pg = b.new_page(viewport={'width':1440,'height':900})
    pg.goto('http://localhost:8150/index.html?frozen#v=ship&s=' + ship)
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    time.sleep(4)
    r = pg.evaluate("""() => { const out = {}; SW.ship.updateMatrixWorld(true);
      SW.ship.traverse(o => { if (!o.isMesh && !o.isLine && !o.isLineSegments) return;
        let pt = null; for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { pt = e.userData.part; break; }
        const k = (pt ? pt.key : '?') + '|' + (o.name || ''); const bb = new THREE.Box3().setFromObject(o);
        (out[k] = out[k] || []).push([bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].map(v => +v.toFixed(3)));
      }); const g = SW.ship; return {parts: out, pos: g.position.toArray(), rot: g.rotation.toArray().slice(0,3)}; }""")
    json.dump(r, open(out, 'w')); b.close(); print('ok', out)

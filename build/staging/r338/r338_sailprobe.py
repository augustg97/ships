import time, json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True); pg = b.new_page(viewport={'width':1440,'height':900})
    pg.goto('http://localhost:8150/index.html?frozen#v=ship&s=endurance')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    time.sleep(3)
    print(json.dumps(pg.evaluate("""() => { const out = []; SW.ship.updateMatrixWorld(true);
      SW.ship.traverse(o => { if (!o.isMesh || !o.material || o.material.side !== THREE.FrontSide) return;
        let pt = null; for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { pt = e.userData.part; break; }
        if (!pt || pt.key !== 'sail') return;
        const bb = new THREE.Box3().setFromObject(o);
        out.push({name: o.name, pname: pt.name, type: o.geometry.type, tris: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count)/3, ud: Object.keys(o.userData), min: bb.min.toArray().map(x=>+x.toFixed(2)), max: bb.max.toArray().map(x=>+x.toFixed(2)), col: o.material.color && o.material.color.getHexString()});
      }); return out; }"""), indent=0))
    b.close()

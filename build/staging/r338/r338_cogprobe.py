import time, json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True); pg = b.new_page(viewport={'width':1440,'height':900})
    pg.goto('http://localhost:8150/index.html?frozen#v=ship&s=cog')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    time.sleep(3)
    print(json.dumps(pg.evaluate("""() => { const out = []; SW.ship.updateMatrixWorld(true);
      SW.ship.traverse(o => { if (!o.isMesh) return;
        let pt = null; for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { pt = e.userData.part; break; }
        if (!pt || pt.key !== 'crossbeam') return;
        const pa = o.geometry.attributes.position, ix = o.geometry.index, nt = ix ? ix.count/3 : pa.count/3;
        const bb = new THREE.Box3().setFromObject(o), cc = bb.getCenter(new THREE.Vector3());
        const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), E = new THREE.Vector3(); let sv = 0, av = 0;
        for (let t = 0; t < nt; t++) { A.fromBufferAttribute(pa, ix ? ix.getX(3*t) : 3*t).applyMatrix4(o.matrixWorld).sub(cc); B.fromBufferAttribute(pa, ix ? ix.getX(3*t+1) : 3*t+1).applyMatrix4(o.matrixWorld).sub(cc); C.fromBufferAttribute(pa, ix ? ix.getX(3*t+2) : 3*t+2).applyMatrix4(o.matrixWorld).sub(cc); const v = A.dot(E.crossVectors(B, C))/6; sv += v; av += Math.abs(v); }
        out.push({name: o.name, type: o.geometry.type, nt, det: +o.matrixWorld.determinant().toFixed(3), side: o.material.side, r: +(sv/av).toFixed(2), scale: o.scale.toArray(), pscale: o.parent.scale.toArray()});
      }); return out; }"""), indent=0))
    b.close()

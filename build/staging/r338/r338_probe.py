import time, json, sys
from playwright.sync_api import sync_playwright
url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8150/index.html?frozen#v=ship&s=fluyt&b=90&l=8&z=1.0'
with sync_playwright() as p:
    b = p.chromium.launch(headless=True); pg = b.new_page(viewport={'width':1440,'height':900})
    pg.goto(url)
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    time.sleep(2)
    r = pg.evaluate("""() => {
      const out = [];
      SW.ship.updateMatrixWorld(true);
      SW.ship.traverse(o => {
        if (!o.isMesh) return;
        const key = o.userData.part && o.userData.part.key;
        if (!['wale','planking','hull'].includes(key) && !/hull|plank|wale/i.test(o.name||'')) return;
        const g = o.geometry, P = g.attributes.position, I = g.index;
        const det = o.matrixWorld.determinant();
        let outP = 0, inP = 0, outS = 0, inS = 0;
        const n = I ? I.count/3 : P.count/3;
        const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
        for (let t = 0; t < n; t++) {
          for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(P, I ? I.getX(3*t+k) : 3*t+k);
          const e1 = v[1].clone().sub(v[0]), e2 = v[2].clone().sub(v[0]);
          const nz = e1.cross(e2).z, cz = (v[0].z+v[1].z+v[2].z)/3;
          if (Math.abs(cz) < 0.05) continue;
          if (cz > 0) { if (nz > 0) outP++; else inP++; } else { if (nz < 0) outS++; else inS++; }
        }
        out.push({key, name: o.name, det: +det.toFixed(3), side: o.material.side, read: !!o.userData.waleRead, outP, inP, outS, inS});
      });
      return out;
    }""")
    print(json.dumps(r, indent=0))
    b.close()

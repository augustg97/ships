import sys, time, json, os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.goto(os.environ.get('WURL', 'http://localhost:8149') + '/index.html?frozen=1#v=ship&s=endurance')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    out = pg.evaluate('''async () => {
      const d = await (await fetch('/data/vessels.json')).json();
      const v = d.vessels.find(x => x.id === 'endurance');
      const G = SHIPS_HULL.buildShip(v.hull, {fine: true}); G.updateMatrixWorld(true);
      const res = [];
      G.traverse(o => { if (!o.isMesh) return; const p = o.userData.part; if (!p || p.key !== 'yard' || p.name !== 'Yard') return;
        const a = o.geometry.attributes.position, V = new THREE.Vector3(); const pts = [];
        for (let k = 0; k < a.count; k++) { V.fromBufferAttribute(a, k).applyMatrix4(o.matrixWorld); pts.push(V.clone()); }
        const c = new THREE.Vector3(); pts.forEach(q => c.add(q)); c.divideScalar(pts.length);
        let xy=0,yy=0,yz=0; pts.forEach(q=>{const dx=q.x-c.x,dy=q.y-c.y,dz=q.z-c.z; xy+=dx*dy; yy+=dy*dy; yz+=dy*dz;}); res.push({xy:+xy.toExponential(2), yy:+yy.toExponential(2), yz:+yz.toExponential(2), n: a.count, c: c.toArray().map(x => +x.toFixed(2)), ymin: Math.min(...pts.map(q=>q.y)).toFixed(2), ymax: Math.max(...pts.map(q=>q.y)).toFixed(2),
                  far: pts.filter(q => Math.abs(q.y - c.y) > 1).length, geo: o.geometry.type, merged: !!o.geometry.userData.mergedUserData });
      });
      return res; }''')
    print(json.dumps(out)); b.close()

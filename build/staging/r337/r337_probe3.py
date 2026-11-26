import json, time
from playwright.sync_api import sync_playwright
JS = r"""
() => { const S = SW; const sh=S.ship; sh.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(sh.matrixWorld).invert();
  const P=new THREE.Vector3(); const res={};
  sh.traverse(o => { if (!o.isMesh) return; const k=(o.userData.part&&o.userData.part.key)||('?'+(o.name||o.type)); const pa=o.geometry.attributes.position; if(!pa) return;
    const M=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);
    for(let i=0;i<pa.count;i++){ P.fromBufferAttribute(pa,i).applyMatrix4(M); if(Math.abs(P.x)<0.3 && P.y>1.9 && P.y<2.3){ const z=Math.abs(P.z); if(!res[k]||z>res[k].z) res[k]={z:+z.toFixed(3), y:+P.y.toFixed(2), vis:o.visible, rord:o.renderOrder, side:o.material.side, dw:o.material.depthWrite, dt:o.material.depthTest, transparent:o.material.transparent}; } } });
  return res; }
"""
with sync_playwright() as p:
    b=p.chromium.launch(headless=True); pg=b.new_page()
    pg.goto('http://localhost:8150/index.html?frozen#v=ship&s=fluyt')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    time.sleep(3)
    print(json.dumps(pg.evaluate(JS), indent=0)); b.close()

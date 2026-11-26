import sys, json, time
from playwright.sync_api import sync_playwright
url='http://localhost:8150'
JS = r"""
() => { const S = (typeof SW !== 'undefined') ? SW : window.SW; if (!S || !S.ship) return 'no SW.ship';
  const out=[]; S.ship.updateMatrixWorld(true);
  S.ship.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.key==='wale') { let vis=true, q=o; while(q){ if(!q.visible) vis=false; q=q.parent; }
     const bb=new THREE.Box3().setFromObject(o); out.push({vis, read: !!o.userData.waleRead, min:bb.min.toArray().map(x=>+x.toFixed(2)), max:bb.max.toArray().map(x=>+x.toFixed(2)), mat: o.material.color.getHexString(), op: o.material.opacity, layers:o.layers.mask}); } });
  return out; }
"""
with sync_playwright() as p:
    b=p.chromium.launch(headless=True); pg=b.new_page()
    pg.goto(url+'/index.html?frozen#v=ship&s=fluyt')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    print(json.dumps(pg.evaluate(JS))); b.close()

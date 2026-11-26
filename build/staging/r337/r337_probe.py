import sys, json, time
from playwright.sync_api import sync_playwright
url=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8150'
JS = r"""
() => {
  const vs = (window.SHIPS_DATA && window.SHIPS_DATA.vessels) || null;
  return fetch('data/vessels.json').then(r=>r.json()).then(d => {
    const v = d.vessels.find(x=>x.id==='fluyt');
    const g = SHIPS_HULL.buildShip(v.hull, {fine:true});
    g.updateMatrixWorld(true);
    const out = {};
    const P = new THREE.Vector3();
    g.traverse(o => { if (!o.isMesh || !o.userData.part) return; const k=o.userData.part.key;
      if (!['wale','planking'].includes(k)) return;
      const pa=o.geometry.attributes.position; const rows=[];
      for (let i=0;i<pa.count;i++){ P.fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld); if (Math.abs(P.x-0)<0.15 && P.z>0) rows.push([+P.y.toFixed(2), +P.z.toFixed(3)]); }
      rows.sort((a,b)=>a[0]-b[0]);
      (out[k+(o.userData.waleRead?'-read':'')] = out[k+(o.userData.waleRead?'-read':'')] || []).push({name:o.userData.part.name, visible:o.visible, n:pa.count, mat:o.material && o.material.type, rows: rows.filter((r,i)=> i%Math.max(1,Math.floor(rows.length/14))===0)});
    });
    return out;
  });
}
"""
with sync_playwright() as p:
    b=p.chromium.launch(headless=True); pg=b.new_page()
    pg.goto(url+'/index.html?frozen#v=ship&s=fluyt')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    print(json.dumps(pg.evaluate(JS), indent=0)[:4000]); b.close()

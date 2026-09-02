import json
from playwright.sync_api import sync_playwright
JS = """() => {
  const SWo = window.SHIPS_SW && window.SHIPS_SW.SW;
  const g = SWo ? SWo.ship : null;
  if (!g) return null;
  const out = {};
  let box = null, cable = null, stone = null, shank = null;
  g.traverse(o => {
    let p = null;
    for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { p = e.userData.part; break; }
    if (o.isMesh && p && p.key === 'woodAnchor') {
      o.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(o);
      if (o.name === 'wa-cable') cable = b;
      else { box = box ? box.union(b) : b;
        if (o.name === 'wa-stone') stone = b;
        if (o.name === 'wa-shank') shank = b; }
    }
  });
  const hull = new THREE.Box3();
  g.traverse(o => {
    let p = null;
    for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { p = e.userData.part; break; }
    if (o.isMesh && p && (p.key === 'hull' || p.key === 'deck')) hull.union(new THREE.Box3().setFromObject(o));
  });
  const f = b => b ? {x:[+b.min.x.toFixed(2),+b.max.x.toFixed(2)], y:[+b.min.y.toFixed(2),+b.max.y.toFixed(2)], z:[+b.min.z.toFixed(2),+b.max.z.toFixed(2)]} : null;
  out.anchor = f(box); out.cable = f(cable); out.stone = f(stone); out.shank = f(shank); out.hull = f(hull);
  return out;
}"""
with sync_playwright() as pw:
    br = pw.chromium.launch()
    p = br.new_page(viewport={"width":1200,"height":800})
    p.goto("http://localhost:8149/?frozen=1#v=ship&s=panokseon", wait_until="load", timeout=60000)
    p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
    print(json.dumps(p.evaluate(JS), indent=1))
    br.close()

#!/usr/bin/env python3
"""r192: the anchor zoom — big viewport, every DOM overlay hidden (the canvas
is #gl; everything else is UI), camera by the probed b/z/l/y, crop to the
anchor's own projected box plus margin."""
import sys
from playwright.sync_api import sync_playwright

out = sys.argv[1]
b_, z_, l_, y_ = sys.argv[2:6]

JS_BOX = """() => {
  const SWo = window.SHIPS_SW && window.SHIPS_SW.SW;
  const g = SWo ? SWo.ship : null;
  if (!g) return null;
  let box = null;
  g.traverse(o => {
    let p = null;
    for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { p = e.userData.part; break; }
    if (o.isMesh && p && p.key === 'yotsumeAnchor' && o.name !== 'ya-cable' && o.name !== 'ya-coil') {
      o.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(o);
      box = box ? box.union(b) : b;
    }
  });
  if (!box) return null;
  const cam = SWo.cam;
  const pts = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y])
    for (const z of [box.min.z, box.max.z]) {
      const v = new THREE.Vector3(x, y, z).project(cam);
      pts.push([(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]);
    }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}"""

with sync_playwright() as pw:
    br = pw.chromium.launch()
    try:
        p = br.new_page(viewport={"width": 1920, "height": 1300})
        p.goto(f"http://localhost:8149/?frozen=1#v=ship&s=sekibune"
               f"&b={b_}&z={z_}&l={l_}&y={y_}&sail=furled",
               wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        p.wait_for_timeout(500)
        p.evaluate("""() => {
            const sw = document.getElementById('shipwright');
            for (const el of sw.children)
                if (!el.querySelector || (el.id !== 'swCanvas' && !el.contains(document.getElementById('swCanvas'))))
                    el.style.display = 'none';
        }""")
        box = p.evaluate(JS_BOX)
        p.wait_for_timeout(200)
        p.screenshot(path=out)
        print("box:", box)
    finally:
        br.close()

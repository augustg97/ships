#!/usr/bin/env python3
"""r192: for candidate b/z/l/y framings, project the yotsume's world box to
screen and report where it lands — pick a framing before burning captures."""
import json, sys
from playwright.sync_api import sync_playwright

CANDS = [(b, z, l, y) for b in (15, 35, 330, 350) for z, l, y in
         ((0.35, 25, 2.0), (0.42, 18, 2.0))]

JS = """() => {
  const out = [];
  const SWo = window.SHIPS_SW && window.SHIPS_SW.SW; const g = SWo ? SWo.ship : null;
  if (!g) return 'no SW.group';
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
  if (!box) return 'no anchor meshes';
  const cam = SWo.cam;
  if (!cam) return 'no camera';
  const pts = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y])
    for (const z of [box.min.z, box.max.z]) {
      const v = new THREE.Vector3(x, y, z).project(cam);
      pts.push([(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, v.z]);
    }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs),
           y0: Math.min(...ys), y1: Math.max(...ys),
           behind: pts.some(p => p[2] > 1) };
}"""

with sync_playwright() as pw:
    br = pw.chromium.launch()
    try:
        for b, z, l, y in CANDS:
            p = br.new_page(viewport={"width": 1440, "height": 900})
            p.goto(f"http://localhost:8149/?frozen=1#v=ship&s=sekibune"
                   f"&b={b}&z={z}&l={l}&y={y}&sail=furled",
                   wait_until="load", timeout=60000)
            p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
            p.wait_for_timeout(400)
            r = p.evaluate(JS)
            print(f"b={b:3} z={z} l={l} y={y}: {json.dumps(r)}")
            p.close()
    finally:
        br.close()

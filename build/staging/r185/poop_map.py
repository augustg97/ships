#!/usr/bin/env python3
"""r185: map the treasure ship's poop top surfaces — the walkability measurement
r184 queued. Ray grid straight down over u 0.64..1.00, z -9..9 in HULL SPACE
(root un-posed, the measure_ship idiom); report first-hit height and part key.
Plus the aft sheet/yard boxes over the poop, for clearance. Needs :8149."""
import json
from playwright.sync_api import sync_playwright

PROBE = """() => {
  if (typeof SW === 'undefined' || !SW.spec) return {err: 'no spec'};
  const S = SW.spec;
  const e = (SW.layout || []).find(en => en.id === S.id);
  if (!e) return {err: 'no layout entry'};
  const root = e.obj;
  const prev = root.rotation.y; root.rotation.y = 0; root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const tagOf = o => { for (let p = o; p; p = p.parent)
    if (p.userData && p.userData.part) return p.userData.part; return null; };
  const L = S.hull.lwl;
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const rows = [];
  for (let ui = 0.64; ui <= 1.001; ui += 0.02) {
    const row = { u: +ui.toFixed(2), pts: [] };
    for (let z = -9; z <= 9.001; z += 1.0) {
      const o = new THREE.Vector3((ui - 0.5) * L, 30, z).applyMatrix4(root.matrixWorld);
      ray.set(o, down);
      const hits = ray.intersectObject(root, true);
      if (hits.length) {
        const t = tagOf(hits[0].object);
        const hp = hits[0].point.clone().applyMatrix4(inv);
        row.pts.push([+z.toFixed(0), +hp.y.toFixed(2),
                      t ? t.key : (hits[0].object.name || '?')]);
      } else row.pts.push([+z.toFixed(0), null, '-']);
    }
    rows.push(row);
  }
  /* aft rig clearance: hull-space boxes of sheet/yard meshes whose centre lies
     over the poop (x > (0.66-0.5)*L) */
  const aft = {};
  for (const key of ['sheet', 'yard']) {
    const c = new THREE.Box3(); let n = 0;
    root.traverse(o => {
      const t = tagOf(o);
      if (!o.isMesh || !t || t.key !== key) return;
      const b = new THREE.Box3().setFromObject(o).applyMatrix4(inv);
      if ((b.min.x + b.max.x) / 2 > (0.66 - 0.5) * L) { c.union(b); n++; }
    });
    aft[key] = n ? { n, min: c.min.toArray().map(v => +v.toFixed(2)),
                     max: c.max.toArray().map(v => +v.toFixed(2)) } : null;
  }
  root.rotation.y = prev; root.updateMatrixWorld(true);
  return { rows, aft };
}"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        p = b.new_page(viewport={"width": 1100, "height": 700})
        p.goto("http://localhost:8149/?frozen=1#v=ship&s=treasure-ship",
               wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        print(json.dumps(p.evaluate(PROBE), indent=1))
    finally:
        b.close()

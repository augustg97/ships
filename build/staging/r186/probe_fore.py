#!/usr/bin/env python3
"""r186: measure the panokseon foredeck — where does walkable surface actually end
forward, and what does the drawn anchor occupy? Ray grid straight down over
u -0.12..0.16 x z 0..2.6, first non-woodAnchor hit; plus the anchor's own mesh
list with world boxes. Read-only. Needs :8149."""
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        p = b.new_page(viewport={"width": 1440, "height": 900})
        p.goto("http://localhost:8149/?frozen=1#v=ship&s=panokseon",
               wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = p.evaluate("""() => {
          const g = SW.ship; const L = 30.0;
          g.updateMatrixWorld(true);
          const root = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
          const tagOf = o => { for (let n = o; n; n = n.parent)
            if (n.userData && n.userData.part) return n.userData.part; return null; };
          const ray = new THREE.Raycaster();
          const grid = [];
          for (let ui = -0.12; ui <= 0.161; ui += 0.02) {
            const row = [];
            for (let z = 0; z <= 2.61; z += 0.65) {
              ray.set(new THREE.Vector3(root.x + (ui - 0.5) * L, root.y + 25, root.z + z),
                      new THREE.Vector3(0, -1, 0));
              const hits = ray.intersectObject(g, true).filter(h => {
                const p2 = tagOf(h.object);
                return !(p2 && p2.key === 'woodAnchor'); });
              row.push(hits.length ? +(hits[0].point.y - root.y).toFixed(2) : null);
            }
            grid.push({u: +ui.toFixed(2), y: row});
          }
          const meshes = [];
          g.traverse(o => { const p2 = tagOf(o);
            if (o.isMesh && p2 && p2.key === 'woodAnchor') {
              const bb = new THREE.Box3().setFromObject(o);
              meshes.push({n: o.name,
                min: bb.min.sub(root).toArray().map(v => +v.toFixed(2)),
                max: bb.max.sub(root).toArray().map(v => +v.toFixed(2))}); }});
          out2 = {rootRot: g.rotation.toArray().slice(0,3)};
          return {grid, meshes, rot: g.rotation.toArray().slice(0,3)};
        }""")
    finally:
        b.close()
print(json.dumps(out, indent=1))

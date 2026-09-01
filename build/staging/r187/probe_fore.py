#!/usr/bin/env python3
"""r187: measure the sekibune foredeck — where does walkable surface end forward,
where does the so-yagura front begin, and what does the drawn anchor occupy? Ray
grid straight down over u -0.10..0.22 x z 0..2.2, first non-yotsumeAnchor hit;
plus the anchor's own mesh list with world boxes. Read-only. Needs :8149."""
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        p = b.new_page(viewport={"width": 1440, "height": 900})
        p.goto("http://localhost:8149/?frozen=1#v=ship&s=sekibune",
               wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = p.evaluate("""() => {
          const g = SW.ship; const L = 22.5;
          g.updateMatrixWorld(true);
          const root = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
          const tagOf = o => { for (let n = o; n; n = n.parent)
            if (n.userData && n.userData.part) return n.userData.part; return null; };
          const ray = new THREE.Raycaster();
          const grid = [];
          for (let ui = -0.10; ui <= 0.221; ui += 0.02) {
            const row = [];
            for (let z = 0; z <= 2.21; z += 0.55) {
              ray.set(new THREE.Vector3(root.x + (ui - 0.5) * L, root.y + 25, root.z + z),
                      new THREE.Vector3(0, -1, 0));
              const hits = ray.intersectObject(g, true).filter(h => {
                const p2 = tagOf(h.object);
                return !(p2 && p2.key === 'yotsumeAnchor'); });
              row.push(hits.length
                ? { y: +(hits[0].point.y - root.y).toFixed(2),
                    part: (tagOf(hits[0].object) || {}).key || hits[0].object.name || '?' }
                : null);
            }
            grid.push({ u: +ui.toFixed(2), z0_055_110_165_220: row });
          }
          const meshes = [];
          g.traverse(o => { const p2 = tagOf(o);
            if (o.isMesh && p2 && p2.key === 'yotsumeAnchor') {
              const bb = new THREE.Box3().setFromObject(o);
              meshes.push({ name: o.name,
                u: [+(((bb.min.x - root.x) / L) + 0.5).toFixed(3),
                    +(((bb.max.x - root.x) / L) + 0.5).toFixed(3)],
                y: [+(bb.min.y - root.y).toFixed(2), +(bb.max.y - root.y).toFixed(2)],
                z: [+(bb.min.z - root.z).toFixed(2), +(bb.max.z - root.z).toFixed(2)] });
            } });
          return { grid, meshes };
        }""")
    finally:
        b.close()
print(json.dumps(out, indent=1))

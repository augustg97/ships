#!/usr/bin/env python3
"""r184: park the Shipwright camera over the treasure ship's bow and screenshot.
Usage: bow_shot.py out.png [dx dy dz] — offsets from the anchor cluster centre,
in hull-world metres. Needs :8149. Chromium dies with the run, always."""
import sys
from playwright.sync_api import sync_playwright

out = sys.argv[1]
dx, dy, dz = (float(a) for a in sys.argv[2:5]) if len(sys.argv) > 4 else (-14.0, 9.0, 14.0)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        p = b.new_page(viewport={"width": 1440, "height": 900})
        p.goto("http://localhost:8149/?frozen=1#v=ship&s=treasure-ship",
               wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        p.evaluate("""([dx, dy, dz]) => {
          const hits = [];
          SW.scene.traverse(o => { if (o.isMesh && /^ia-/.test(o.name)) hits.push(o); });
          if (!hits.length) return 'NO ia- MESHES';
          const c = new THREE.Box3();
          for (const o of hits) c.union(new THREE.Box3().setFromObject(o));
          const ctr = c.getCenter(new THREE.Vector3());
          SW.cam.position.set(ctr.x + dx, ctr.y + dy, ctr.z + dz);
          SW.cam.lookAt(ctr);
          SW.cam.updateProjectionMatrix();
          return [ctr.x, ctr.y, ctr.z].map(v => +v.toFixed(2));
        }""", [dx, dy, dz])
        p.wait_for_timeout(700)
        p.screenshot(path=out)
    finally:
        b.close()
print("wrote", out)

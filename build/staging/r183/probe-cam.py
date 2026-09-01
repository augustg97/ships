from playwright.sync_api import sync_playwright
import json
with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        p = b.new_page(viewport={"width": 1440, "height": 900})
        p.goto("http://localhost:8149/?frozen=1#v=ship&s=junk", wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = p.evaluate("""() => {
          const cp = SW.cam.getWorldPosition(new THREE.Vector3());
          const r = {cam: [cp.x, cp.y, cp.z].map(v=>+v.toFixed(2)),
                     shipX: SW.shipX, waterY: SW.waterY, hits: []};
          SW.scene.traverse(o => {
            if (o.isMesh && (o.name === 'st-stone' || o.name === 'st-cable')) {
              const wp = o.getWorldPosition(new THREE.Vector3());
              r.hits.push({n: o.name, wp: [wp.x, wp.y, wp.z].map(v=>+v.toFixed(2))});
            }
          });
          return r;
        }""")
    finally:
        b.close()
print(json.dumps(out))

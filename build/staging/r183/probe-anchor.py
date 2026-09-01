from playwright.sync_api import sync_playwright
import json
with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        p = b.new_page(viewport={"width": 1440, "height": 900})
        p.goto("http://localhost:8149/?frozen=1#v=ship&s=junk", wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = p.evaluate("""() => {
          const res = {found: [], cam: null};
          const scene = (typeof SW !== 'undefined' && SW.scene) || null;
          const cam = (typeof SW !== 'undefined' && SW.cam) || null;
          const roots = [];
          if (scene) roots.push(scene);
          const hits = [];
          for (const r of roots) r.traverse(o => {
            if (o.isMesh && /^st-/.test(o.name)) hits.push(o);
          });
          for (const o of hits.slice(0, 12)) {
            const wp = o.getWorldPosition(new THREE.Vector3());
            let vis = true, n = o;
            while (n) { if (n.visible === false) vis = false; n = n.parent; }
            const e = {name: o.name, wp: [wp.x, wp.y, wp.z].map(v=>+v.toFixed(2)), vis};
            if (cam) {
              const pr = wp.clone().project(cam);
              e.ndc = [pr.x, pr.y, pr.z].map(v=>+v.toFixed(3));
            }
            res.found.push(e);
          }
          res.count = hits.length;
          res.sceneKeys = (typeof SW !== 'undefined') ? Object.keys(SW).slice(0,30) : ['no SW'];
          return res;
        }""")
    finally:
        b.close()
print(json.dumps(out, indent=1))

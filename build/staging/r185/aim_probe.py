#!/usr/bin/env python3
"""r185: for b/z/l/y+sail, report each stern assembly's screen px AND the first
hit along the camera ray to it — visible means the first hit IS the anchor."""
import sys, json
from playwright.sync_api import sync_playwright

b_, z_, l_, y_ = sys.argv[1:5]
sail = sys.argv[5] if len(sys.argv) > 5 else "furled"

with sync_playwright() as pw:
    br = pw.chromium.launch()
    try:
        p = br.new_page(viewport={"width":1440,"height":900})
        p.goto(f"http://localhost:8149/?frozen=1#v=ship&s=treasure-ship&b={b_}&z={z_}&l={l_}&y={y_}&sail={sail}",
               wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        p.wait_for_timeout(2000)
        print(json.dumps(p.evaluate("""() => {
          const grps = [];
          SW.scene.traverse(o => { if (o.isGroup && o.name === 'ia-grp') grps.push(o); });
          const stern = grps.slice(3);
          const ray = new THREE.Raycaster();
          return stern.map(gr => {
            const bb = new THREE.Box3().setFromObject(gr);
            const c = bb.getCenter(new THREE.Vector3());
            c.y = bb.max.y - 0.15;                    /* aim near the standing claws */
            const s = c.clone().project(SW.cam);
            ray.set(SW.cam.position, c.clone().sub(SW.cam.position).normalize());
            const h = ray.intersectObject(SW.scene, true)[0];
            const part = h ? (o => { for (let e = o; e; e = e.parent)
              if (e.userData && e.userData.part) return e.userData.part.key;
              return h.object.name; })(h.object) : 'nothing';
            return { cam: SW.cam.position.toArray().map(v=>+v.toFixed(1)), px: [+((s.x+1)/2*1440).toFixed(0), +((1-(s.y+1)/2)*900).toFixed(0)],
                     firstHit: part, hitName: h ? (h.object.name||'') : '' };
          });
        }""")))
    finally:
        br.close()

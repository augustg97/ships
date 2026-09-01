#!/usr/bin/env python3
"""r185: for a given b/z/l/y, report where the stern-pair assemblies project on
screen (NDC -> px), so the shot can be aimed by number, not by guess."""
import sys, json
from playwright.sync_api import sync_playwright

b_, z_, l_, y_ = (sys.argv[1:5] + ["187", "0.28", "12", "11.5"][len(sys.argv) - 1:])[:4]
sail = sys.argv[5] if len(sys.argv) > 5 else "furled"

with sync_playwright() as pw:
    br = pw.chromium.launch()
    try:
        p = br.new_page(viewport={"width": 1440, "height": 900})
        p.goto(f"http://localhost:8149/?frozen=1#v=ship&s=treasure-ship"
               f"&b={b_}&z={z_}&l={l_}&y={y_}&sail={sail}",
               wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        p.wait_for_timeout(400)
        out = p.evaluate("""() => {
          const grps = [];
          SW.scene.traverse(o => { if (o.isGroup && o.name === 'ia-grp') grps.push(o); });
          const res = [];
          for (const gr of grps) {
            const c = new THREE.Box3().setFromObject(gr).getCenter(new THREE.Vector3());
            const p2 = c.clone().project(SW.cam);
            res.push({ x: +((p2.x + 1) / 2 * 1440).toFixed(0),
                       y: +((1 - (p2.y + 1) / 2) * 900).toFixed(0),
                       z: +p2.z.toFixed(3) });
          }
          return res;
        }""")
        print(json.dumps(out))
    finally:
        br.close()

#!/usr/bin/env python3
"""r193: anchor look — big viewport, DOM overlays hidden, camera by b/z/l/y,
prints the part's projected box; crops to it plus margin if PIL is present.

  look_shot.py <out.png> <ship> <partKey> <b> <z> <l> <y> [excludeNames,csv]
"""
import sys
from playwright.sync_api import sync_playwright

out, ship, key, b_, z_, l_, y_ = sys.argv[1:8]
excl = (sys.argv[8].split(',') if len(sys.argv) > 8 else [])

JS_BOX = """(args) => {
  const SWo = window.SHIPS_SW && window.SHIPS_SW.SW;
  const g = SWo ? SWo.ship : null;
  if (!g) return null;
  let box = null;
  g.traverse(o => {
    let p = null;
    for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { p = e.userData.part; break; }
    if (o.isMesh && p && p.key === args.key && !args.excl.includes(o.name)) {
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
        p.goto(f"http://127.0.0.1:8151/?frozen=1#v=ship&s={ship}"
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
        box = p.evaluate(JS_BOX, {"key": key, "excl": excl})
        p.wait_for_timeout(200)
        p.screenshot(path=out)
        print("box:", box)
    finally:
        br.close()

if box:
    try:
        from PIL import Image
        im = Image.open(out)
        m = 260
        x0 = max(0, int(box[0]) - m); y0 = max(0, int(box[1]) - m)
        x1 = min(im.width, int(box[2]) + m); y1 = min(im.height, int(box[3]) + m)
        if x1 > x0 + 40 and y1 > y0 + 40:
            im.crop((x0, y0, x1, y1)).save(out.replace('.png', '-crop.png'))
            print("crop:", (x0, y0, x1, y1))
    except ImportError:
        pass

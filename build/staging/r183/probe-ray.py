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
          let stone = null;
          SW.scene.traverse(o => { if (o.isMesh && o.name === 'st-stone') stone = o; });
          const sp = stone.getWorldPosition(new THREE.Vector3());
          const dir = sp.clone().sub(cp).normalize();
          const rc = new THREE.Raycaster(cp, dir);
          const hits = rc.intersectObjects(SW.scene.children, true)
            .filter(h => h.object.isMesh)
            .slice(0, 6)
            .map(h => ({name: h.object.name || h.object.parent.name || '(unnamed)',
                        d: +h.distance.toFixed(2),
                        pt: [h.point.x, h.point.y, h.point.z].map(v=>+v.toFixed(2))}));
          return {cam: cp.toArray().map(v=>+v.toFixed(2)),
                  stone: sp.toArray().map(v=>+v.toFixed(2)),
                  distToStone: +cp.distanceTo(sp).toFixed(2), hits};
        }""")
    finally:
        b.close()
print(json.dumps(out, indent=1))

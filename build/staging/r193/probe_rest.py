#!/usr/bin/env python3
"""r193 probe: measure the clean rest-ray gap for the dhow's grapnel and the
junk's stone anchor with the STAGED rule's exact geometry, before predicting."""
import json

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.goto("http://localhost:8151/?frozen=1#v=ship", wait_until="load", timeout=60000)
            page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
            out = page.evaluate("""() => {
              const list = APP.vessels.vessels || APP.vessels;
              const tagOf = o => { for (let e = o; e; e = e.parent)
                if (e.userData && e.userData.part) return e.userData.part; return null; };
              const NONBEARING = new Set(['stay','shroud','halyard','brace','lift',
                                          'sheet','tack','ratline','oar','mast']);
              const res = {};
              for (const [vid, key, coil, cable] of [
                  ['dhow', 'grapnel', 'grap-coil', 'grap-cable'],
                  ['junk', 'stoneAnchor', null, 'st-cable']]) {
                const v = list.find(x => x.id === vid);
                const H = v.hull || v;
                const g = SHIPS_HULL.buildShip(H, { fine: true });
                g.updateMatrixWorld(true);
                const ms = [];
                g.traverse(o => { const p = tagOf(o);
                  if (o.isMesh && p && p.key === key) ms.push(o); });
                const bb = new THREE.Box3();
                for (const o of ms) if (o.name !== coil && o.name !== cable)
                  bb.union(new THREE.Box3().setFromObject(o));
                const ray = new THREE.Raycaster();
                ray.set(new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y + 0.5,
                                          (bb.min.z + bb.max.z) / 2),
                        new THREE.Vector3(0, -1, 0));
                const under = ray.intersectObject(g, true).filter(h => {
                  const p = tagOf(h.object);
                  return !(p && (p.key === key || NONBEARING.has(p.key))); });
                res[vid] = {
                  meshes: ms.length,
                  bbMinY: +bb.min.y.toFixed(4), bbMaxY: +bb.max.y.toFixed(4),
                  u: +(((bb.min.x + bb.max.x) / 2) / (H.lwl || H.loa) + 0.5).toFixed(4),
                  hits: under.slice(0, 3).map(h => ({
                    y: +h.point.y.toFixed(4),
                    name: h.object.name || '(unnamed)',
                    part: (tagOf(h.object) || {}).key || '(untagged)' })),
                  gap: under.length ? +(bb.min.y - under[0].point.y).toFixed(4) : null,
                };
              }
              return res;
            }""")
        finally:
            browser.close()
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    main()

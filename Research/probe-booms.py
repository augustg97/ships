#!/usr/bin/env python3
"""Measure every gaff boom in the fleet, per hull, in metres.

  "$STUDIO/.venv/bin/python" Research/probe-booms.py

For each hull that draws a 'Boom' part: report every boom's length, its span in
hull x, its height, and how far it stands past the stern (surfacePoint at u=1).
Rule 7: every hull scored individually. This is the before/after instrument for
the aftermost-boom clamp (found r99, taken r101): gapAft*0.78 discounted swing
clearance against a stern that is not an obstruction.
"""
import json, sys

JS = r"""
async () => {
  const list = (typeof APP !== 'undefined' && (APP.vessels.vessels || APP.vessels)) || [];
  const out = [];
  for (const v of list) {
    if (!v.hull || !v.hull.masts) continue;
    const S = v.hull;
    let g;
    try { g = SHIPS_HULL.buildShip(S, { fine: true }); } catch (e) { out.push({id: v.id, err: String(e)}); continue; }
    const H = SHIPS_HULL.hullSurface(S);
    const sternX = SHIPS_HULL.surfacePoint(S, H, 1, 1)[0];
    g.updateMatrixWorld(true);
    const booms = [];
    g.traverse(o => {
      if (!o.isMesh || !o.userData || !o.userData.part) return;
      if (o.userData.part.name !== 'Boom') return;
      const b = new THREE.Box3().setFromObject(o);
      booms.push({ len: +(b.max.x - b.min.x).toFixed(2),
                   x0: +b.min.x.toFixed(2), x1: +b.max.x.toFixed(2),
                   y:  +((b.min.y + b.max.y) / 2).toFixed(2),
                   pastSternM: +(b.max.x - sternX).toFixed(2) });
    });
    if (!booms.length) continue;
    booms.sort((a, b) => a.x0 - b.x0);
    out.push({ id: v.id, lwl: S.lwl, sternX: +sternX.toFixed(2), booms });
  }
  return out;
}
"""

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = page.evaluate(JS)
        browser.close()
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    sys.exit(main())

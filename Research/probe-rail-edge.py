#!/usr/bin/env python3
"""Measure every drawn deck-edge rail against the true surface edge, per hull.

  "$STUDIO/.venv/bin/python" Research/probe-rail-edge.py

For each hull with a 'rail' part: walk the rail stations (vertices come in 4s),
recover each station's u by nearest-x against surfacePoint(u,1), and report the
worst inboard/outboard error of the rail's OUTER face against the true deck edge
(trueHb + 0.3r, the section's drawn outer offset). Rule 7: every hull scored
individually. This is the before/after instrument for the stale
halfB*wl*(1-tumble) rail formula (deferred r98, taken r100).
"""
import json, sys

JS = r"""
async () => {
  const list = (typeof APP !== 'undefined' && (APP.vessels.vessels || APP.vessels)) || [];
  const out = [];
  for (const v of list) {
    if (!v.hull) continue;
    const S = v.hull;
    let g;
    try { g = SHIPS_HULL.buildShip(S, { fine: true }); } catch (e) { out.push({id: v.id, err: String(e)}); continue; }
    const H = SHIPS_HULL.hullSurface(S);
    const sp = (u) => SHIPS_HULL.surfacePoint(S, H, u, 1);
    // sample the edge once for x -> u inversion
    const NS = 800, xs = [], us = [];
    for (let i = 0; i <= NS; i++) { const u = i / NS; us.push(u); xs.push(sp(u)[0]); }
    const uOfX = (x) => { let bi = 0, bd = Infinity;
      for (let i = 0; i <= NS; i++) { const d = Math.abs(xs[i] - x); if (d < bd) { bd = d; bi = i; } }
      return us[bi]; };
    const r = S.capM ? S.capM / 1.6 : S.beam * 0.016;
    g.updateMatrixWorld(true);
    let worstIn = 0, worstOut = 0, uIn = null, uOut = null, stations = 0, railMeshes = 0;
    g.traverse(o => {
      if (!o.isMesh || !o.userData || !o.userData.part || o.userData.part.key !== 'rail') return;
      railMeshes++;
      const pos = o.geometry.attributes.position;
      for (let k = 0; k + 3 < pos.count; k += 4) {
        let maxZ = 0, px = pos.getX(k);
        for (let j = 0; j < 4; j++) maxZ = Math.max(maxZ, Math.abs(pos.getZ(k + j)));
        const u = uOfX(px);
        const want = Math.abs(sp(u)[2]) + r * 0.3;
        const err = maxZ - want;           // <0: rail inboard of the true edge
        stations++;
        if (err < worstIn)  { worstIn = err;  uIn = u; }
        if (err > worstOut) { worstOut = err; uOut = u; }
      }
    });
    out.push({ id: v.id, railMeshes, stations,
               worstInboardM: Math.round(worstIn * 100) / 100, uIn,
               worstOutboardM: Math.round(worstOut * 100) / 100, uOut });
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

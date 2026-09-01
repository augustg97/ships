#!/usr/bin/env python3
"""r174, read-only: the drawn shells' half-breadth and deck height at bow stations,
for the junk and the treasure-ship, BEFORE any record is written. The windlass
station and barrel length are chosen against these numbers, and the sim proves the
audit's V-SPAN arm on them. No web/ file is touched."""
import json
from playwright.sync_api import sync_playwright

JS = """
async () => {
  const list = APP.vessels.vessels || APP.vessels;
  const out = {};
  for (const id of ['junk', 'treasure-ship']) {
    const v = list.find(x => x.id === id), H = v.hull;
    const g = SHIPS_HULL.buildShip(H, { fine: true });
    g.updateMatrixWorld(true);
    let plank = null, deck = [];
    g.traverse(o => {
      const t = o.userData && o.userData.part ? o.userData.part.key
              : (o.parent && o.parent.userData.part ? o.parent.userData.part.key : null);
      if (o.isMesh && t === 'planking' && !plank) plank = o;
    });
    const L = H.loa || H.lwl;
    const rows = [];
    if (plank) {
      const a = plank.geometry.attributes.position;
      for (const u of [0.04, 0.06, 0.08, 0.10, 0.12, 0.15, 0.20]) {
        const sx = (u - 0.5) * L;
        let zmax = 0, ytop = -1e9;
        for (let i = 0; i < a.count; i++) {
          if (Math.abs(a.getX(i) - sx) < 0.6) {
            zmax = Math.max(zmax, Math.abs(a.getZ(i)));
            ytop = Math.max(ytop, a.getY(i));
          }
        }
        rows.push({ u, zmax: +zmax.toFixed(3), ytop: +ytop.toFixed(3) });
      }
    }
    out[id] = { loa: L, beam: H.beam, rows,
                deckKeys: Object.keys(H).filter(k => /deck|windlass|capstan/i.test(k)) };
  }
  return out;
}
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = page.evaluate(JS)
    finally:
        browser.close()
print(json.dumps(out, indent=1))

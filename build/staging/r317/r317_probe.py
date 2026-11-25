"""r317: the lateen mizzen on a square mast — yard record, the square lower segment's geometry near the sling."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8149'
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!['east-indiaman','slave-ship','carrack','fluyt'].includes(v.id)) continue;
    const r = { yards: [], segs: [] };
    const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
    g.updateMatrixWorld(true);
    g.traverse(o => { if (!o.isMesh) return;
      if (o.userData.lateen) r.yards.push(o.userData.lateen);
      const sg = o.userData.seg;
      if (sg && sg.mi === v.hull.masts.length - 1) r.segs.push({ si: sg.si, footY: sg.footY, headY: sg.headY, geo: o.geometry.type, p: o.geometry.parameters ? { rt: o.geometry.parameters.radiusTop, rb: o.geometry.parameters.radiusBottom, h: o.geometry.parameters.height } : null });
    });
    out[v.id] = r;
  }
  return out;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        pg = b.new_page(viewport={"width": 800, "height": 600})
        pg.goto(URL + "/?frozen=1#v=ship", wait_until="load", timeout=90000)
        pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
        res = pg.evaluate(JS)
    finally: b.close()
json.dump(res, open(OUT, 'w'), indent=0)
print(json.dumps(res)[:4000])

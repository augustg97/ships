"""r331: the fluyt's hoisting yards: where each is set, over its mast's foot and its section's head."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2]
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const v = list.find(x => x.id === 'fluyt');
  const out = [];
  for (const furled of [false]) {
    const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
    g.traverse(o => { if (o.isMesh && o.userData.hoistAt) { const h = o.userData.hoistAt;
      out.push({ mast: h.mast, section: h.section, from: h.from, frac: h.frac, base: +h.base.toFixed(3), head: +h.head.toFixed(3), setY: h.setY,
                 overFoot: +(h.setY - h.base).toFixed(3), headOverFoot: +(h.head - h.base).toFixed(3), share: +((h.setY - h.base)/(h.head - h.base)).toFixed(4),
                 axisY: o.userData.slung ? o.userData.slung.axisY : null }); } });
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
json.dump(res, open(OUT, 'w'), indent=1)
for r in res: print(json.dumps(r))

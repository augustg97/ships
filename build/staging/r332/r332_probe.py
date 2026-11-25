"""r332: the fluyt's hoisting yards and square cloths per mast, set and furled builds."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2]
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const v = list.find(x => x.id === 'fluyt');
  const out = {};
  for (const furled of [false, true]) {
    const g = SHIPS_HULL.buildShip(v.hull, { fine: true, furled });
    g.updateMatrixWorld(true);
    const rec = { yards: [], uncrossed: [], cloth: {}, furls: 0, yardsAll: 0, segs: [] };
    g.traverse(o => { if (!o.isMesh) return;
      if (o.userData.hoistAt) { const h = o.userData.hoistAt; rec.yards.push({ mast: h.mast, section: h.section, from: h.from, setY: h.setY, y: +o.position.y.toFixed(3), lowered: o.userData.lowered ? o.userData.lowered.lowered : null }); }
      if (o.userData.uncrossed) rec.uncrossed.push(o.userData.uncrossed);
      if (o.userData.seg) rec.segs.push({ mi: o.userData.seg.mi, si: o.userData.seg.si, foot: +o.userData.seg.footY.toFixed(3), head: +o.userData.seg.headY.toFixed(3) });
      if (o.userData.kind === 'square') { const k = String(o.userData.mast !== undefined ? o.userData.mast : '?'); rec.cloth[k] = (rec.cloth[k] || 0) + 1; }
      if (o.userData.kind === 'furl') rec.furls++;
      if (o.userData.slung) rec.yardsAll++;
    });
    out[furled ? 'furled' : 'set'] = rec;
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
print(json.dumps(res)[:3000])

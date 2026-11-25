"""r314: every hoisting yard in every square-rigged hull's furled and set fine builds: set y, built y, rest, onto."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8150'
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!v.hull || !(v.hull.masts || []).some(m => m.rig === 'square')) continue;
    const rows = [];
    for (const furled of [false, true]) {
      const g = SHIPS_HULL.buildShip(v.hull, { fine: true, furled });
      g.updateMatrixWorld(true);
      g.traverse(o => { if (o.isMesh && o.userData.slung) {
        const L = o.userData.lowered || null;
        rows.push({ furled, mast: L ? L.mast : null, y: +o.position.y.toFixed(3), rec: L, rollR: o.userData.slung.rollR, r: o.userData.slung.yardR });
      } });
    }
    out[v.id] = rows;
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
for k, rows in res.items():
    low = [r for r in rows if r['furled'] and r['rec'] and r['rec'].get('setY') is not None]
    hoisted = [r for r in rows if r['furled'] and r['rec'] and r['rec'].get('setY') is None]
    print(f"{k:22s} yards {sum(1 for r in rows if r['furled']):3d}  lowered {len(low):2d}  tie-yards not lowered {len(hoisted):2d}  " +
          ' '.join(f"m{r['rec']['mast']}:{r['rec']['setY']:.1f}->{r['y']:.1f}({r['rec']['onto'][4:8]})" for r in low))

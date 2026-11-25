"""r316: every doubled-rig mast (mk.yards): section feet/heads, each yard's height, frac, hoist, lowered; set and furled."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8150'
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!v.hull || !(v.hull.masts || []).some(m => m.rig === 'square' && m.yards)) continue;
    const r = { masts: {}, set: [], furled: [] };
    for (const furled of [false, true]) {
      const g = SHIPS_HULL.buildShip(v.hull, { fine: true, furled });
      g.updateMatrixWorld(true);
      g.traverse(o => { if (!o.isMesh) return;
        const sg = o.userData.seg;
        if (sg && !furled) (r.masts[sg.mi] = r.masts[sg.mi] || []).push([sg.si, +sg.footY.toFixed(2), +sg.headY.toFixed(2)]);
        const yf = o.userData.yardFrac;
        if (yf) { const L = o.userData.lowered;
          r[furled ? 'furled' : 'set'].push({ mast: yf.mast, name: yf.name, frac: yf.frac, from: yf.from, hoist: yf.hoist,
            y: +(+yf.y).toFixed(2), yPlan: +(+yf.yPlan).toFixed(2), base: +yf.base.toFixed(2), T: +yf.T.toFixed(2),
            R: o.userData.slung ? o.userData.slung.yardR : null, rollR: o.userData.slung ? o.userData.slung.rollR : null,
            low: L ? (L.lowered === false ? 'no:' + L.why : (L.onto || '')) : '' }); }
      });
    }
    for (const k in r.masts) r.masts[k].sort((a, b) => a[0] - b[0]);
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
for k, r in res.items():
    print('##', k)
    for mi, segs in sorted(r['masts'].items()):
        print(f"  mast {mi}: " + '  '.join(f"s{s}[{f}..{h}]" for s, f, h in segs))
        for st in ('set', 'furled'):
            ys = sorted([y for y in r[st] if y['mast'] == int(mi)], key=lambda y: y['y'])
            print(f"    {st:6s} " + '  '.join(f"{y['name']}@{y['y']}({y['frac']:.3f} {y['from'][0]} {y['hoist'][0]} R{y['R']} {y['low']})" for y in ys))

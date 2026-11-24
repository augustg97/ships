"""r301: which named parts each Shipwright build stage adds, per powered/rigless hull."""
import json, sys
from playwright.sync_api import sync_playwright
SHIPS = sys.argv[1].split(',')
OUT = sys.argv[2]
JS = """
async (ship) => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const v = list.find(x => x.id === ship);
  const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
  const out = {};
  g.traverse(o => { const p = o.userData && o.userData.part; if (!p) return;
    const s = out[p.stage] || (out[p.stage] = {}); const k = p.key + ' | ' + p.name;
    s[k] = (s[k] || 0) + 1; });
  return out;
}
"""
res = {}
with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        pg = b.new_page(viewport={"width": 800, "height": 600})
        pg.goto("http://localhost:8149/?frozen=1#v=ship&s=titanic", wait_until="load", timeout=90000)
        pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
        for s in SHIPS: res[s] = pg.evaluate(JS, s)
    finally: b.close()
json.dump(res, open(OUT, 'w'), indent=1)

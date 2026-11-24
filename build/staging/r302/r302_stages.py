"""r302: which part keys each Shipwright stage 3-7 adds, for every hull that sets sail."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const res = {};
  for (const v of list) {
    const H = v.hull; if (!H) continue;
    const sail = (H.masts || []).some(m => m.rig && m.rig !== 'none' && m.rig !== 'pole') || !!H.headsails;
    const g = SHIPS_HULL.buildShip(H, { fine: true });
    const out = {};
    g.traverse(o => { const p = o.userData && o.userData.part; if (!p || p.stage < 3) return;
      const s = out[p.stage] || (out[p.stage] = {}); const k = p.key + ' | ' + p.name;
      s[k] = (s[k] || 0) + 1; });
    res[v.id] = { sail, build: H.build, rigs: (H.masts || []).map(m => m.rig + (m.segments ? ':' + m.segments : '')), parts: out };
  }
  return res;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        pg = b.new_page(viewport={"width": 800, "height": 600})
        pg.goto("http://localhost:8149/?frozen=1#v=ship&s=titanic", wait_until="load", timeout=90000)
        pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
        res = pg.evaluate(JS)
    finally: b.close()
json.dump(res, open(OUT, 'w'), indent=1)

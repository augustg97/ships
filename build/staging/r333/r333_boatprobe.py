import json, sys
from playwright.sync_api import sync_playwright
JS = """() => { const list = (APP.vessels.vessels || APP.vessels) || []; const out = [];
  for (const v of list) { if (!v.hull) continue; const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
    g.traverse(o => { if (o.userData && o.userData.skidBoat) out.push([v.id, o.userData.skidBoat.u, o.userData.skidBoat.moved, +o.position.x.toFixed(3), o.userData.skidBoat.lengthM]); }); }
  return out; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={"width": 800, "height": 600})
    pg.goto(sys.argv[1] + "/?frozen=1#v=ship", wait_until="load", timeout=90000)
    pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
    r = pg.evaluate(JS); b.close()
for x in r: print(x)

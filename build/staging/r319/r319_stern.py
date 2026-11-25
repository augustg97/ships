import json, sys
from playwright.sync_api import sync_playwright
JS = """() => { const out = {};
 for (const v of (APP.vessels.vessels || APP.vessels)) { if (!['carrack','fluyt','east-indiaman','slave-ship','caravel','galleass','dhow','galley'].includes(v.id)) continue;
  const S = v.hull, H = SHIPS_HULL.hullSurface(S);
  out[v.id] = { lwl: S.lwl, xStern: +(0.5*S.lwl + H.rake(1)).toFixed(3), sheer1: +H.sheer(1).toFixed(3), deck1: +H.deck(1).toFixed(3),
    sheer98: +H.sheer(0.98).toFixed(3), rake1: +H.rake(1).toFixed(3), transom: S.transom, halfB: S.beam/2, castles: S.castles || null }; }
 return out; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=90000)
    pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
    r = pg.evaluate(JS); b.close()
for k, v in r.items(): print(k, v)

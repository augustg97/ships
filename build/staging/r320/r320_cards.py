import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
JS = """() => { const out = {};
 for (const v of (APP.vessels.vessels || APP.vessels)) { if (!['east-indiaman','slave-ship'].includes(v.id)) continue;
  const g = SHIPS_HULL.buildShip(v.hull, { fine: true }); const by = {};
  g.traverse(o => { const p = o.userData && o.userData.part; if (!p) return; const sg = o.userData.seg;
    (by[p.stage] = by[p.stage] || []).push(sg ? { key: p.key, name: p.name, mi: sg.mi, si: sg.si } : { key: p.key, name: p.name }); });
  out[v.id] = {}; for (const st of [4,5,6,7]) { try { out[v.id][st] = SW_STAGE_CARD(v, st, by[st] || []); } catch (e) { out[v.id][st] = 'ERR ' + e.message; } }
  const gf = SHIPS_HULL.buildShip(v.hull, { fine: true, furled: true });
  try { out[v.id].furled = swFurledCard(v, gf); } catch (e) { out[v.id].furled = 'ERR ' + e.message; } }
 return out; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.goto(URL + "/?frozen=1#v=ship", wait_until="load", timeout=90000)
    pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
    print(json.dumps(pg.evaluate(JS), indent=1)); b.close()

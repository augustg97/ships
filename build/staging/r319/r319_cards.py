from playwright.sync_api import sync_playwright
JS = """() => { const out = {};
 for (const v of (APP.vessels.vessels || APP.vessels)) { if (!['east-indiaman','slave-ship','carrack','fluyt','dhow'].includes(v.id)) continue;
  const g = SHIPS_HULL.buildShip(v.hull, { fine: true }); const by = {};
  g.traverse(o => { const p = o.userData && o.userData.part; if (!p || p.stage < 3) return; const sg = o.userData.seg;
    (by[p.stage] = by[p.stage] || []).push(sg ? { key: p.key, name: p.name, mi: sg.mi, si: sg.si } : { key: p.key, name: p.name }); });
  out[v.id] = SW_STAGE_CARD(v, 6, by[6] || []); }
 return out; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=90000)
    pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
    for k, c in pg.evaluate(JS).items(): print(k, '|', c[0], '|', c[1]); print()
    b.close()

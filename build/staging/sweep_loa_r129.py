#!/usr/bin/env python3
"""Fleet sweep: drawn planking x-span vs the record's loa, every hull, one page load.

  "$STUDIO/.venv/bin/python" build/staging/sweep_loa_r129.py

Needs the :8149 server. Prints one row per hull, sorted by (drawn - loa) descending.
"""
import json, sys

SWEEP = """async () => {
  const list = (typeof APP !== 'undefined' && (APP.vessels.vessels || APP.vessels)) || [];
  const rows = [];
  for (const v of list) {
    if (!v.hull) continue;
    const H = v.hull;
    let g = null;
    try { g = SHIPS_HULL.buildShip(H, { fine: true }); }
    catch (e) { rows.push({ id: v.id, err: '' + e }); continue; }
    const tagOf = o => { for (let e = o; e; e = e.parent)
      if (e.userData && e.userData.part) return e.userData.part; return null; };
    let pk = null;
    g.traverse(o => { if (!pk && o.isMesh && tagOf(o) && tagOf(o).key === 'planking') pk = o; });
    if (!pk) { rows.push({ id: v.id, err: 'no planking' }); continue; }
    const P = pk.geometry.attributes.position;
    let x0 = 1e9, x1 = -1e9;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i); if (x < x0) x0 = x; if (x > x1) x1 = x; }
    rows.push({ id: v.id, loa: H.loa, lwl: H.lwl,
                stemRake: H.stemRake || 0, sternRake: H.sternRake || 0,
                drawn: +(x1 - x0).toFixed(2), over: +((x1 - x0) - H.loa).toFixed(2) });
    g.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
  }
  return rows;
}"""


def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1200, "height": 800})
            page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=150000)
            page.wait_for_function("window.__FRAME_READY === true", timeout=150000)
            rows = page.evaluate(SWEEP)
        finally:
            browser.close()
    rows.sort(key=lambda r: -(r.get("over") or -1e9))
    for r in rows:
        if r.get("err"):
            print(f'{r["id"]:20s} ERR {r["err"]}')
        else:
            print(f'{r["id"]:20s} loa {r["loa"]:7.2f}  lwl {r["lwl"]:7.2f}  rakes {r["stemRake"]:.3f}/{r["sternRake"]:.3f}'
                  f'  drawn {r["drawn"]:7.2f}  over {r["over"]:+7.2f}')
    n_over = sum(1 for r in rows if not r.get("err") and r["over"] > 0.05)
    print(f'\n{len(rows)} hulls, {n_over} drawn longer than their record loa', file=sys.stderr)
    return 0

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Fleet sweep, deck-aware (r137): drawn planking x-span vs the record's loa, every hull,
one page load — and for hulls whose record says the LOA is measured over the flight deck
(flightDeckLen), the extreme span over planking+flightdeck too, because on a carrier the
deck, not the shell, is what the record's length measures to.

  "$STUDIO/.venv/bin/python" build/staging/sweep_loa_r137.py

Needs the :8149 server. Prints one row per hull, sorted by (fill - loa) descending, where
fill is the extreme span for flightDeckLen hulls and the planking span for everyone else.
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
    let px0 = 1e9, px1 = -1e9, ex0 = 1e9, ex1 = -1e9, sawDeck = false;
    g.updateMatrixWorld(true);
    g.traverse(o => {
      if (!o.isMesh || !tagOf(o)) return;
      const key = tagOf(o).key;
      if (key !== 'planking' && key !== 'flightdeck') return;
      const P = o.geometry.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i) + (key === 'flightdeck' ? o.position.x : 0);
        if (key === 'planking') { if (x < px0) px0 = x; if (x > px1) px1 = x; }
        if (x < ex0) ex0 = x; if (x > ex1) ex1 = x;
      }
      if (key === 'flightdeck') sawDeck = true;
    });
    if (px0 > px1) { rows.push({ id: v.id, err: 'no planking' }); continue; }
    const drawn = +(px1 - px0).toFixed(2);
    const extreme = +(ex1 - ex0).toFixed(2);
    const fill = (H.flightDeckLen && sawDeck) ? extreme : drawn;
    rows.push({ id: v.id, loa: H.loa, lwl: H.lwl,
                stemRake: H.stemRake || 0, sternRake: H.sternRake || 0,
                drawn, extreme: sawDeck ? extreme : null,
                over: +(fill - H.loa).toFixed(2) });
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
            page.goto("http://localhost:8149/?frozen=1#v=ship",
                      wait_until="load", timeout=60000)
            page.wait_for_function("window.__FRAME_READY === true", timeout=90000)
            rows = page.evaluate(SWEEP)
        finally:
            browser.close()
    rows.sort(key=lambda r: -(r.get('over') if r.get('over') is not None else -1e9))
    for r in rows:
        if 'err' in r:
            print(f"{r['id']:<20} ERR {r['err']}")
            continue
        deck = f"  deck-extreme {r['extreme']:7.2f}" if r.get('extreme') else ""
        print(f"{r['id']:<20} loa {r['loa']:7.2f}  lwl {r['lwl']:7.2f}  "
              f"rakes {r['stemRake']:.4f}/{r['sternRake']:.4f}  "
              f"drawn {r['drawn']:7.2f}{deck}  over {r['over']:+7.2f}")


if __name__ == '__main__':
    main()

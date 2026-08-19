#!/usr/bin/env python3
"""r124: measure the land row before judging it (rule 4).

At the sahul open-water waypoint in era 0: what landward() actually returns (true range,
bearing, hit point), what the fine raster's texel is, and what the row now prints. Then the
same at Yamato's 1945 position, where the name must SURVIVE the new gates — a fix that
strips every name is a regression dressed as honesty.
"""
import json, sys

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = page.evaluate("""
async () => {
  const drain = async () => {
    for (let w = 0; w < 2000 && typeof fleetQueueBusy === 'function' && fleetQueueBusy(); w++) {
      try { pumpFleetQueue(24); } catch (e) { break; }
      await new Promise(r => setTimeout(r, 0));
    }
  };
  const RT = window.SHIPS_ROUTE;
  const ask = (lon, lat) => {
    const cell = document.createElement('div');
    cell.innerHTML = '<table><tr><td class="pc-land">—</td></tr></table>';
    PSGV.landKey = undefined;
    fillLandRow(cell, { at: { lon, lat } });
    const lw = landward({ lon, lat });
    return { year: S.year, datum: RT.FINE.datum, level: RT.FINE.level, w: RT.FINE.w,
             texKm: 40075 / RT.FINE.w * Math.cos(lat * Math.PI / 180),
             lw: lw && { az: +(lw.az * 180 / Math.PI).toFixed(1), trueKm: lw.trueKm,
                         lon: +lw.lon.toFixed(3), lat: +lw.lat.toFixed(3), h: +lw.h.toFixed(1) },
             text: cell.querySelector('.pc-land').textContent };
  };
  const r = {};
  selectEra(0); await drain();
  r.sahul = ask(126.4, -10.1);
  selectEra(6); await drain();
  S.year = 1945; onTime(); await drain();
  r.yamato = ask(129.0, 30.5);       /* the Ten-ichi-go track, East China Sea off Kyushu */
  selectEra(0); await drain();
  return r;
}""")
        browser.close()
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    sys.exit(main())

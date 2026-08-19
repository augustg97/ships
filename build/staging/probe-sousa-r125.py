#!/usr/bin/env python3
"""r125: why does the shipped Sousa track cross 12.65 km of drawn land while the router's
own final clearSegments counted zero blocked segments? Print the legs bracketing the graze,
their spacing, and re-run the router's own 1-km blocked test on exactly those segments."""
import json

JS = """
async () => {
  const RT = window.SHIPS_ROUTE;
  const drain = async () => {
    for (let w = 0; w < 4000 && typeof fleetQueueBusy === 'function' && fleetQueueBusy(); w++) {
      try { pumpFleetQueue(24); } catch (e) { break; }
      await new Promise(r => setTimeout(r, 0));
    }
  };
  selectEra(4); await drain();
  const tr = eraTracks.find(t => /Sousa/.test(t.name));
  if (!tr) return { err: 'no track' };
  const legs = tr.legs;
  const out = { datum: RT.FINE.datum, level: RT.FINE.level, n: legs.length, segs: [] };
  for (let i = 0; i < legs.length - 1; i++) {
    const A = legs[i], B = legs[i + 1];
    if (Math.abs(A.lon + 38.7) > 1.5 || Math.abs(A.lat + 12.9) > 1.5) continue;
    const km = RT.gcKm(A, B);
    /* the router's own test: 1-km samples, interior only */
    const n = Math.max(2, Math.ceil(km / 1));
    let dry = 0;
    for (let k = 1; k < n; k++) {
      const p = RT.gcSlerp(A, B, k / n);
      if (!RT.fineIsWater(p.lon, p.lat)) dry++;
    }
    /* and the fine walk including k=0 */
    const nf = Math.max(1, Math.ceil(km / 0.25));
    let dryF = 0;
    for (let k = 0; k < nf; k++) {
      const p = RT.gcSlerp(A, B, k / nf);
      if (!RT.fineIsWater(p.lon, p.lat)) dryF++;
    }
    out.segs.push({ i, a: [+A.lon.toFixed(3), +A.lat.toFixed(3)],
                    b: [+B.lon.toFixed(3), +B.lat.toFixed(3)],
                    km: +km.toFixed(2), dry1km: dry, dryQtr: dryF,
                    aWet: RT.fineIsWater(A.lon, A.lat), bWet: RT.fineIsWater(B.lon, B.lat) });
  }
  return out;
}
"""

from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:8149/?frozen=1", wait_until="load", timeout=60000)
    page.wait_for_function("window.__FRAME_READY === true", timeout=90000)
    out = page.evaluate(JS)
    browser.close()
print(json.dumps(out, indent=1))

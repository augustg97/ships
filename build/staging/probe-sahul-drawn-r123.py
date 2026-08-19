#!/usr/bin/env python3
"""r123: what track does the app ACTUALLY draw for the sahul voyage (routed legsR),
and where is the ship on it at frozen t=0? Sampled against FINE at the era datum."""
import json
from playwright.sync_api import sync_playwright

JS = """
async () => {
  const RT = window.SHIPS_ROUTE;
  const out = { fineSig: RT.FINE.sig, fineDatum: RT.FINE.datum, fineLevel: RT.FINE.level };
  // the era fleet's assembled tracks
  const ets = (window.APP && APP.eraTracks) || (typeof eraTracks !== 'undefined' ? eraTracks : null);
  out.eraTracksKeys = ets ? (Array.isArray(ets) ? ets.length : Object.keys(ets)) : null;
  // find the sahul item
  let tr = null;
  if (Array.isArray(ets)) tr = ets.find(t => t.v && t.v.id === 'sahul');
  if (!tr && ets && ets.sahul) tr = ets.sahul;
  if (!tr) return out;
  out.found = true;
  const legs = tr.legsR || tr.legs || null;
  out.nPts = legs ? legs.length : 0;
  if (legs) {
    out.samples = [];
    let onLand = 0;
    for (let i = 0; i < legs.length; i++) {
      const p = legs[i];
      const wet = RT.fineIsWater ? RT.fineIsWater(p.lon, p.lat) : null;
      if (wet === false) onLand++;
      if (i % Math.max(1, Math.floor(legs.length / 40)) === 0 || wet === false)
        out.samples.push([+(p.lon.toFixed(2)), +(p.lat.toFixed(2)), wet]);
    }
    out.onLand = onLand;
  }
  out.u = tr.u !== undefined ? tr.u : null;
  out._lo = tr._lo; out._la = tr._la;
  return out;
}
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:8149/?frozen=1#e=0&f=sahul", wait_until="load", timeout=60000)
    page.wait_for_function("window.__FRAME_READY === true", timeout=90000)
    out = page.evaluate(JS)
    browser.close()
print(json.dumps(out, indent=1))

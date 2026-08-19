#!/usr/bin/env python3
"""r123: walk the Sahul voyage track over the model's own elevation field at the era's
sea level, and print a coarse land/water map of the Timor-Sahul corridor so corrected
waypoints can be derived FROM THE MODEL'S OWN DATA rather than eyeballed."""
import json
from playwright.sync_api import sync_playwright

JS = """
async () => {
  const P = window.SHIPS_PSG.PSG;
  const lu = P.land.material.uniforms;
  const out = { uSeaLevel: lu.uSeaLevel.value };
  const tex = lu.uDepth.value, img = tex.image;
  out.tex = { w: img.width, h: img.height };
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const px = cx.getImageData(0, 0, img.width, img.height).data;
  const elevAt = (lonDeg, latDeg) => {
    let u = lonDeg / 360 + 0.5, v = 0.5 - latDeg / 180;
    u = ((u % 1) + 1) % 1; v = ((v % 1) + 1) % 1;
    const x = Math.min(img.width - 1, Math.floor(u * img.width));
    const y = Math.min(img.height - 1, Math.floor(v * img.height));
    const i = (y * img.width + x) * 4;
    return (px[i] * 256 + px[i + 1]) / 65535 * 20000 - 11000 - lu.uSeaLevel.value;
  };

  /* 1. the current track, sampled every 1% */
  const legs = [[122.5, -8.6], [125.5, -9.6], [128.5, -11.0], [130.4, -12.4]];
  out.trackProfile = [];
  for (let s = 0; s <= 100; s++) {
    const t = s / 100 * (legs.length - 1);
    const i = Math.min(legs.length - 2, Math.floor(t)), f = t - i;
    const lon = legs[i][0] + (legs[i + 1][0] - legs[i][0]) * f;
    const lat = legs[i][1] + (legs[i + 1][1] - legs[i][1]) * f;
    out.trackProfile.push([+(lon.toFixed(2)), +(lat.toFixed(2)), Math.round(elevAt(lon, lat))]);
  }

  /* 2. coarse land/water map, 0.1 deg cells, lon 122..132, lat -14..-8
        '#' land above the era sea level, '.' water */
  out.map = [];
  for (let lat = -8.0; lat >= -14.0; lat -= 0.1) {
    let row = '';
    for (let lon = 122.0; lon <= 132.0; lon += 0.1) {
      row += elevAt(lon, lat) > 0 ? '#' : '.';
    }
    out.map.push(lat.toFixed(1) + ' ' + row);
  }
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

print("uSeaLevel", out["uSeaLevel"], "tex", out["tex"])
print("\n-- track profile (lon, lat, elev m; >0 = LAND) --")
land = [p for p in out["trackProfile"] if p[2] > 0]
for p in out["trackProfile"][::4]:
    print(p)
print(f"\n{len(land)}/101 samples on LAND")
if land:
    print("first land sample:", land[0], " last:", land[-1])
print("\n-- corridor map, 0.1 deg, lon 122E..132E left to right --")
print("      " + "".join(str(int(122 + i)) if abs((122 + i * 1) % 1) < 1e-9 else "" for i in range(11)))
for row in out["map"]:
    print(row)

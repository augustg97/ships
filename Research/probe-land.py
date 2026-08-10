#!/usr/bin/env python3
"""Probe the near-field land in a Sea close-up: sun, uniforms, and the elevation
field along the line of sight. Round 65, the featureless-coast diagnosis.

  "$STUDIO/.venv/bin/python" Research/probe-land.py '#e=6&f=tenichigo'
"""
import json, sys

FRAG = sys.argv[1] if len(sys.argv) > 1 else '#e=6&f=tenichigo'

JS = """
async () => {
  const P = window.SHIPS_PSG.PSG;
  const lu = P.land && P.land.material.uniforms;
  const out = { landVisible: P.land && P.land.visible };
  if (!lu) return out;
  const sun = lu.uSun.value;
  const smooth = (a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
  out.sun = { x:sun.x, y:sun.y, z:sun.z };
  out.day = smooth(-0.26, 0.20, sun.y);
  out.uMPP = lu.uMPP.value;
  out.uLandLift = lu.uLandLift.value;
  out.uSeaLevel = lu.uSeaLevel.value;
  out.anchor = { lonRad: lu.uAnchor.value.x, latRad: lu.uAnchor.value.y };
  out.cam = { x:P.cam.position.x, y:P.cam.position.y, z:P.cam.position.z };
  out.camDir = (()=>{ const d = new THREE.Vector3(); P.cam.getWorldDirection(d);
                      return {x:d.x,y:d.y,z:d.z}; })();

  /* sample the elevation raster the shader reads, CPU-side */
  const tex = lu.uDepth.value;
  const img = tex && tex.image;
  out.depthTex = img ? { w: img.width, h: img.height, kind: img.constructor.name } : null;
  if (img) {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const px = cx.getImageData(0, 0, img.width, img.height).data;
    const elevAt = (lonRad, latRad) => {
      let u = lonRad / (2*Math.PI) + 0.5, v = 0.5 - latRad / Math.PI;
      u = ((u % 1) + 1) % 1; v = ((v % 1) + 1) % 1;
      const x = Math.min(img.width-1, Math.floor(u*img.width));
      const y = Math.min(img.height-1, Math.floor(v*img.height));
      const i = (y*img.width + x) * 4;
      return (px[i]*256 + px[i+1]) / 65535 * 20000 - 11000 - out.uSeaLevel;
    };
    /* walk the camera's horizontal look direction over the ground from the anchor.
       shader frame: +X west, +Z north; lon = anchor.lon - x/(R cl), lat = anchor.lat + z/R */
    const R = 6371000, cl = Math.max(0.05, Math.cos(out.anchor.latRad));
    const dir = { x: out.camDir.x, z: out.camDir.z };
    const n = Math.hypot(dir.x, dir.z); dir.x/=n; dir.z/=n;
    out.profile = [];
    for (let km = 0; km <= 120; km += 2) {
      const x = out.cam.x + dir.x * km * 1000, z = out.cam.z + dir.z * km * 1000;
      const lon = out.anchor.lonRad - x / (R * cl);
      const lat = out.anchor.latRad + z / R;
      out.profile.push([km, Math.round(elevAt(lon, lat))]);
    }
    /* the raster's own vertical variation at the first land sample = the vAmp source */
    const first = out.profile.find(p => p[1] > 0);
    if (first) {
      const km = first[0];
      const x = out.cam.x + dir.x * km * 1000, z = out.cam.z + dir.z * km * 1000;
      const lon = out.anchor.lonRad - x / (R * cl);
      const lat = out.anchor.latRad + z / R;
      const texel = 4900 / R;
      const e = elevAt(lon, lat);
      const hE = elevAt(lon + texel/cl, lat), hN = elevAt(lon, lat + texel);
      out.firstLand = { km, e: Math.round(e),
                        vAmpRaw: +(0.22*(Math.abs(hE-e)+Math.abs(hN-e))).toFixed(1),
                        fade9to34: +(1 - smooth(9000, 34000, km*1000)).toFixed(3) };
    }
  }
  return out;
}
"""

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1" + FRAG, wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=90000)
        out = page.evaluate(JS)
        browser.close()
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    main()

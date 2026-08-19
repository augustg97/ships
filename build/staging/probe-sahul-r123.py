#!/usr/bin/env python3
"""Diagnosis probe for the dark Sahul passage frame (r123): what state is the page in?"""
import json
from playwright.sync_api import sync_playwright

URL = "http://localhost:8149/?frozen=1#e=0&f=sahul"

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--force-color-profile=srgb"])
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(URL, wait_until="load", timeout=60000)
    page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
    page.wait_for_timeout(600)
    out = page.evaluate("""() => {
      const P = (window.SHIPS_PSG && window.SHIPS_PSG.PSG) || null;
      const r = {};
      if (!P) return {err: 'no PSG'};
      r.on = P.on; r.mode = P.mode || null;
      r.lon = P.lon; r.lat = P.lat; r.u = P.u;
      r.landVisible = P.land ? P.land.visible : null;
      const su = P.sea ? P.sea.material.uniforms : null;
      r.uHasDepth = su ? su.uHasDepth.value : null;
      r.uSeaLevel = su ? su.uSeaLevel.value : null;
      r.uDepthBound = su ? !!su.uDepth.value : null;
      r.sunY = P.sun ? P.sun.position.clone().normalize().y : null;
      r.sunIntensity = P.sun ? P.sun.intensity : null;
      r.shipInScene = !!P.ship;
      if (P.ship) {
        r.shipPos = P.ship.position.toArray().map(v => +v.toFixed(2));
        r.shipVisible = P.ship.visible;
        let n = 0; P.ship.traverse(o => { if (o.isMesh && o.visible) n++; });
        r.shipVisibleMeshes = n;
      }
      r.camPos = P.cam ? P.cam.position.toArray().map(v => +v.toFixed(1)) : null;
      // sample the elevation field the way the shader does, at the anchor
      const gm = (typeof mat !== 'undefined' && mat) ? mat.uniforms : null;
      r.globeHasDepthTex = !!(gm && gm.uDepth && gm.uDepth.value);
      r.globeSeaLevel = gm && gm.uSeaLevel ? gm.uSeaLevel.value : null;
      return r;
    }""")
    print(json.dumps(out, indent=1))
    browser.close()

#!/usr/bin/env python3
"""Probe the close-up wake: the hero ship's speed, heading and position at the frozen
instant, the uWake* uniforms actually bound, and the derived physics the shader draws —
Kelvin arm half-angle (fixed), transverse wavelength lambda = 2*pi*V^2/g, wake length.
Prints the ship's lon/lat in DEGREES so a descent frame can be addressed straight over
her with #c=<lon>,<lat>&z=<m>. Round 111, the wake due-diligence pass.

  "$STUDIO/.venv/bin/python" Research/probe-wake.py '#e=7&f=boxroute'
"""
import json, sys

FRAG = sys.argv[1] if len(sys.argv) > 1 else '#e=7&f=boxroute'

JS = """
async () => {
  const P = window.SHIPS_PSG.PSG;
  const u = P.sea && P.sea.material.uniforms;
  const out = { psgOn: P.on };
  if (!u || !u.uWakeKn) return out;
  out.wake = {
    kn: u.uWakeKn.value,
    len: u.uWakeLen.value,
    beam: u.uWakeBeam.value,
    p: { x: u.uWakeP.value.x, z: u.uWakeP.value.y },
    dir: { x: u.uWakeDir.value.x, z: u.uWakeDir.value.y },
  };
  const V = out.wake.kn * 0.5144;
  out.derived = {
    mps: +V.toFixed(2),
    lambdaM: +Math.max(2.0, 2 * Math.PI * V * V / 9.81).toFixed(1),
    /* the shader's own visible-length law: len = uWakeLen * 6 * clamp(kn/16, .25, 1.5) */
    drawnLenM: +(out.wake.len * 6 *
                 Math.min(1.5, Math.max(0.25, out.wake.kn / 16))).toFixed(0),
    froude: +(V / Math.sqrt(9.81 * out.wake.len)).toFixed(3),
  };
  /* the patch anchor is a lon/lat; the hero sits at uWakeP metres from it in the
     (west, up, north) frame, so her own lon/lat is recoverable — that is the address
     a descent camera needs to stand over her */
  if (u.uAnchor) {
    const R = 6371000, aLon = u.uAnchor.value.x, aLat = u.uAnchor.value.y;
    const cl = Math.max(0.05, Math.cos(aLat));
    const sLat = aLat + out.wake.p.z / R;
    const sLon = aLon - out.wake.p.x / (R * cl);
    out.anchorDeg = { lon: +(aLon * 180 / Math.PI).toFixed(5),
                      lat: +(aLat * 180 / Math.PI).toFixed(5) };
    out.shipDeg = { lon: +(sLon * 180 / Math.PI).toFixed(5),
                    lat: +(sLat * 180 / Math.PI).toFixed(5) };
  }
  out.hdgFromDirDeg = +((Math.atan2(out.wake.dir.x, out.wake.dir.z) * 180 / Math.PI + 360) % 360).toFixed(1);
  out.cam = P.cam ? { x: +P.cam.position.x.toFixed(1), y: +P.cam.position.y.toFixed(1),
                      z: +P.cam.position.z.toFixed(1) } : null;
  out.descentActive = window.SHIPS_PSG.psgDescentActive
    ? !!window.SHIPS_PSG.psgDescentActive() : null;
  out.uScale = u.uScale ? u.uScale.value : null;
  out.wind = u.uWind ? u.uWind.value : null;
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

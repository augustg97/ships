#!/usr/bin/env python3
"""At a descent address (#e=&v=sea&c=&z=), report where the hero ship and her wake
actually land in the frame: the camera's position and forward azimuth in the patch
frame, the hero's patch position, and her NDC projection. Round 111.

  "$STUDIO/.venv/bin/python" Research/probe-wake-descent.py '#e=7&v=sea&c=99.22794,-2.50731&z=1500'
"""
import json, sys

FRAG = sys.argv[1] if len(sys.argv) > 1 else '#e=7&v=sea&c=99.22794,-2.50731&z=1500'

JS = """
async () => {
  const P = window.SHIPS_PSG.PSG;
  const u = P.sea && P.sea.material.uniforms;
  const out = { mode: P.mode };
  if (!u || !u.uWakeKn) return out;
  out.wakeKn = u.uWakeKn.value;
  out.hero = { x: u.uWakeP.value.x, z: u.uWakeP.value.y };
  out.dir  = { x: u.uWakeDir.value.x, z: u.uWakeDir.value.y };
  out.cam  = { x: +P.cam.position.x.toFixed(1), y: +P.cam.position.y.toFixed(1),
               z: +P.cam.position.z.toFixed(1) };
  const d = new THREE.Vector3(); P.cam.getWorldDirection(d);
  out.camDir = { x: +d.x.toFixed(3), y: +d.y.toFixed(3), z: +d.z.toFixed(3) };
  /* patch frame is (west, up, north): azimuth of the camera's ground look, degrees
     from north toward WEST (so it matches compass via 360 - a) */
  out.camAzFromNorthTowardWest = +((Math.atan2(d.x, d.z) * 180 / Math.PI + 360) % 360).toFixed(1);
  const pr = new THREE.Vector3(out.hero.x, 0, out.hero.z).project(P.cam);
  out.heroNDC = { x: +pr.x.toFixed(3), y: +pr.y.toFixed(3), z: +pr.z.toFixed(3) };
  /* where does the camera's centre ray meet the sea? cam + t*dir with y hitting 0 */
  if (d.y < -0.001) {
    const t = -P.cam.position.y / d.y;
    out.centreHit = { x: +(P.cam.position.x + d.x * t).toFixed(0),
                      z: +(P.cam.position.z + d.z * t).toFixed(0),
                      groundM: +t.toFixed(0) };
  }
  const hulls = [];
  if (P.fleetPool) for (const [k, e] of P.fleetPool)
    if (e.holder.visible) hulls.push({ name: k,
      x: +e.holder.position.x.toFixed(0), z: +e.holder.position.z.toFixed(0) });
  out.visibleHulls = hulls;
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

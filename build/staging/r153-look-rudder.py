"""r153 diagnostic: the sea hidden, camera at the stern quarter looking at the rudder."""
import sys
from playwright.sync_api import sync_playwright

ship = sys.argv[1] if len(sys.argv) > 1 else "yamato"
out = sys.argv[2] if len(sys.argv) > 2 else f"build/staging/r153-look-rudder-{ship}.png"

JS = """
() => {
  SW.ground.visible = false;
  if (SW.shore) SW.shore.visible = false;
  let rud = null;
  SW.yard.traverse(o => {
    if (o.isMesh && o.userData.part && o.userData.part.name === 'Rudder') rud = o;
  });
  if (!rud) return 'NO RUDDER';
  const bb = new THREE.Box3().setFromObject(rud);
  const c = bb.getCenter(new THREE.Vector3());
  const size = bb.getSize(new THREE.Vector3()).length();
  const d = Math.max(18, size * 2.2);
  SW.cam.position.set(c.x + d * 0.72, c.y + d * 0.28, c.z + d * 0.62);
  SW.cam.lookAt(c);
  SW.cam.updateProjectionMatrix();
  SW.renderer.render(SW.scene, SW.cam);
  return JSON.stringify({ c: c.toArray(), size });
}
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1600, "height": 1000})
        page.goto(f"http://localhost:8149/?frozen=1#v=ship&s={ship}",
                  wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        print(page.evaluate(JS))
        page.screenshot(path=out)
    finally:
        browser.close()
print(out)

"""r153 diagnostic 2: sea hidden, camera below the horizon at the stern quarter."""
import sys
from playwright.sync_api import sync_playwright

ship = sys.argv[1] if len(sys.argv) > 1 else "yamato"
spin = float(sys.argv[2]) if len(sys.argv) > 2 else 250.0
lat = float(sys.argv[3]) if len(sys.argv) > 3 else -0.10
out = sys.argv[4] if len(sys.argv) > 4 else f"build/staging/r153-look2-{ship}.png"

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 2000, "height": 1250})
        page.goto(f"http://localhost:8149/?frozen=1#v=ship&s={ship}",
                  wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        page.evaluate(
            "([s, l]) => { SW.ground.visible = false; if (SW.shore) SW.shore.visible = false;"
            " SW.shipSpin = s * Math.PI / 180; SW.lat = l; }", [spin, lat])
        page.wait_for_timeout(400)
        page.screenshot(path=out)
    finally:
        browser.close()
print(out)

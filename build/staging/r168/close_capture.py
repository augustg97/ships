"""Close crop of a ship in the Shipwright: bearing, lat and relative zoom from argv.
Usage: python close_capture.py <ship> <deg> <lat> <dist> <out.png>
"""
import sys
from playwright.sync_api import sync_playwright

ship, deg, lat, dist, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), \
                            float(sys.argv[4]), sys.argv[5]

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"http://localhost:8149/?frozen=1#v=ship&s={ship}",
                  wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        page.evaluate(
            "([deg, lat, dist]) => { SW.shipSpin = deg * Math.PI / 180;"
            " SW.lat = lat; SW.dist = dist; }", [deg, lat, dist])
        page.wait_for_timeout(1400)          # let the eased camera settle
        page.screenshot(path=out)
    finally:
        browser.close()
print(out)

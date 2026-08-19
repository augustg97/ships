import sys
from playwright.sync_api import sync_playwright
url = sys.argv[1]; out = sys.argv[2]
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={"width":1440,"height":900}, device_scale_factor=2)
    pg.goto(url, wait_until="load", timeout=60000)
    pg.wait_for_function("window.__FRAME_READY === true", timeout=90000)
    pg.screenshot(path=out)
    b.close()
print("saved", out)

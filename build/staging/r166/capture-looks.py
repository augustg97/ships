#!/usr/bin/env python3
"""r166 look captures — the round and the screen, from the plates' own bearings."""
from playwright.sync_api import sync_playwright

LOOKS = [
    ("look-quarter-elevated", "b=145&l=40&y=25"),          # the aerial's stern grammar
    ("look-astern-low",       "b=168&l=10&y=14&z=0.45"),   # the low quarter-astern
    ("look-astern-portrait",  "b=180&l=8&y=18&z=0.8"),     # plate 3's own bearing
    ("look-t7-close",         "b=150&l=45&y=30&z=0.3"),    # close on the jacuzzi step
]

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        for name, view in LOOKS:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            url = f"http://localhost:8149/?frozen=1#v=ship&s=queen-mary-2&{view}"
            page.goto(url, wait_until="load", timeout=60000)
            page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
            page.wait_for_timeout(900)
            page.screenshot(path=f"build/staging/r166/{name}.png")
            print(name, "captured")
            page.close()
    finally:
        browser.close()

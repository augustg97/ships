#!/usr/bin/env python3
"""r165 look captures — the wing views, from the plate's own bearings."""
import sys
from playwright.sync_api import sync_playwright

LOOKS = [
    ("look-quarter-elevated", "b=145&l=40&y=25"),          # the r161/162 stern grammar view
    ("look-astern-low",       "b=168&l=10&y=14&z=0.45"),   # r164's low quarter-astern
    ("look-wing-close",       "b=135&l=25&y=30&z=0.35"),   # close on the main-pool wings
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
            page.screenshot(path=f"build/staging/r165/{name}.png")
            print(name, "captured", url)
            page.close()
    finally:
        browser.close()

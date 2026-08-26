#!/usr/bin/env python3
"""r158: look at the staged Myeongnyang Action — rule 1, before any baseline is chosen."""
import sys
from playwright.sync_api import sync_playwright

VIEWS = [
    ("d2-approach",  "day=2&cb=45&cd=2600&ch=18"),
    ("d3-flood",     "day=3&cb=45&cd=1100&ch=13"),
    ("d3-fromSE",    "day=3&cb=150&cd=1400&ch=11"),
    ("d6-ebb",       "day=6&cb=45&cd=1400&ch=14"),
    ("d6-low",       "day=6&cb=100&cd=700&ch=7"),
]

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        for name, q in VIEWS:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.goto(f"http://localhost:8149/?frozen=1#v=action&bt=myeongnyang&{q}",
                      wait_until="load", timeout=60000)
            page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
            page.wait_for_timeout(600)
            page.screenshot(path=f"build/staging/r158/look-{name}.png")
            print("captured", name)
            page.close()
    finally:
        browser.close()

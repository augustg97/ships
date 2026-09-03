#!/usr/bin/env python3
"""r210: witness the card's amended Beam row (the two designs, 33/33.8 and 27.8 over 27) RENDERED."""
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        pg = b.new_page(viewport={"width": 1440, "height": 1600})
        pg.goto("http://localhost:8149/?frozen=1#v=ship&s=panokseon", wait_until="load", timeout=60000)
        pg.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        found = pg.evaluate("""() => {
          const els = [...document.querySelectorAll('*')];
          const beam = els.find(e => e.children.length === 0 && /27\\.8척 on both/.test(e.textContent));
          if (beam) beam.scrollIntoView({block:'center'});
          return { beam: !!beam, text: beam ? beam.textContent.slice(-420) : null };
        }""")
        print("rendered in DOM:", found)
        pg.wait_for_timeout(500)
        pg.screenshot(path="build/staging/r210/card-row-witness.png")
    finally:
        b.close()

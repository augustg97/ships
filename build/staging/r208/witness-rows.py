#!/usr/bin/env python3
"""r208: witness the card's amended Beam row and new 1882 row RENDERED."""
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        pg = b.new_page(viewport={"width": 1440, "height": 1600})
        pg.goto("http://localhost:8149/?frozen=1#v=ship&s=panokseon", wait_until="load", timeout=60000)
        pg.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        found = pg.evaluate("""() => {
          const els = [...document.querySelectorAll('*')];
          const beam = els.find(e => e.children.length === 0 && /fighting deck's breadth/.test(e.textContent));
          const r82  = els.find(e => e.children.length === 0 && /척량성책/.test(e.textContent));
          if (r82) r82.scrollIntoView({block:'center'});
          return { beam: !!beam, r1882: !!r82 };
        }""")
        print("rendered in DOM:", found)
        pg.wait_for_timeout(500)
        pg.screenshot(path="build/staging/r208/card-row-witness.png")
    finally:
        b.close()

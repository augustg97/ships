#!/usr/bin/env python3
"""One-off: open the corbita in the Shipwright, scroll the panel to Measurements and
sources, screenshot — the row KEY carries markdown ("The grain ship *Isis*") and the
cite line carries three titles, so one shot shows every member of the fixed class."""
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship&s=corbita",
                  wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        found = page.evaluate("""() => {
            const rows = document.getElementById('swRows');
            const cite = document.getElementById('swCite');
            if (!rows) return null;
            cite.scrollIntoView({block:'end'});
            return {rowsHTML: rows.innerHTML.slice(0, 400),
                    citeHTML: cite.innerHTML.slice(0, 400),
                    stars: (rows.textContent + ' ' + cite.textContent).includes('*')};
        }""")
        print("panel:", found)
        page.wait_for_timeout(400)
        page.screenshot(path="build/staging/r180/z-corbita-card-rows.png")
    finally:
        browser.close()

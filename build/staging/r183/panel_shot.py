#!/usr/bin/env python3
"""One-off: open the dhow card, scroll its panel to the Windlass row, screenshot it."""
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship&s=junk", wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        found = page.evaluate("""() => {
            const els = [...document.querySelectorAll('*')];
            const el = els.find(e => e.children.length === 0 && /Ground tackle, as drawn/.test(e.textContent||''));
            if (!el) return null;
            el.scrollIntoView({block:'center'});
            const r = el.getBoundingClientRect();
            return {x:r.x, y:r.y, w:r.width, h:r.height, text:(el.textContent||'').slice(0,60)};
        }""")
        print("row element:", found)
        page.wait_for_timeout(400)
        page.screenshot(path="build/staging/r183/z-junk-card-anchor.png")
    finally:
        browser.close()

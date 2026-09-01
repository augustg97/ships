#!/usr/bin/env python3
"""r188: open the treasure card, scroll to the Ground tackle row, screenshot,
and probe for raw asterisks (the r180 rule's own check)."""
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship&s=treasure-ship",
                  wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        found = page.evaluate("""() => {
            const els = [...document.querySelectorAll('*')];
            const el = els.find(e => e.children.length === 0 && /Ground tackle, as drawn/.test(e.textContent||''));
            if (!el) return null;
            el.scrollIntoView({block:'center'});
            const r = el.getBoundingClientRect();
            const raw = /\\*/.test(el.parentElement ? el.parentElement.textContent : '');
            return {x:r.x, y:r.y, w:r.width, h:r.height, rawStar:raw,
                    text:(el.textContent||'').slice(0,80)};
        }""")
        print("row element:", found)
        page.wait_for_timeout(400)
        page.screenshot(path="build/staging/r189/z-tre-card-anchor.png")
    finally:
        browser.close()

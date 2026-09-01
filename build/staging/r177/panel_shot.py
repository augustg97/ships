#!/usr/bin/env python3
"""One-off: open the corbita card, scroll to the Windlass part entry, screenshot it;
then click it and screenshot the parts card with the Roman sentence."""
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship&s=corbita", wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        found = page.evaluate("""() => {
            const els = [...document.querySelectorAll('*')];
            const el = els.find(e => e.children.length === 0 && /^\\s*Windlass\\s*$/.test(e.textContent||''));
            if (!el) return null;
            el.scrollIntoView({block:'center'});
            const r = el.getBoundingClientRect();
            return {x:r.x, y:r.y, w:r.width, h:r.height, tag:el.tagName};
        }""")
        print("windlass entry:", found)
        page.wait_for_timeout(400)
        page.screenshot(path="build/staging/r177/z-corbita-panel-windlass.png")
        if found:
            page.mouse.click(found["x"] + found["w"] / 2, found["y"] + found["h"] / 2)
            page.wait_for_timeout(600)
            got = page.evaluate("""() => {
                const els = [...document.querySelectorAll('*')];
                const el = els.find(e => e.children.length === 0 && /Piraeus/.test(e.textContent||''));
                if (el) { el.scrollIntoView({block:'center'}); return (el.textContent||'').slice(0,140); }
                return null;
            }""")
            print("card text with Piraeus:", got)
            page.wait_for_timeout(300)
            page.screenshot(path="build/staging/r177/z-corbita-parts-card.png")
    finally:
        browser.close()

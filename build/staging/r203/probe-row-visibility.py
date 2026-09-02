#!/usr/bin/env python3
"""Is the junk's 'Ground tackle, as drawn' row inside the ship-junk frame viewport?"""
import json, sys
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship&s=junk", wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = page.evaluate("""() => {
            const hits = [];
            const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (walk.nextNode()) {
                const t = walk.currentNode.textContent;
                if (t && t.includes('Ground tackle')) {
                    const el = walk.currentNode.parentElement;
                    const r = el.getBoundingClientRect();
                    const cs = getComputedStyle(el);
                    hits.push({tag: el.tagName, top: r.top, bottom: r.bottom, left: r.left,
                               visible: r.bottom > 0 && r.top < 900 && r.right > 0 && r.left < 1440
                                        && cs.display !== 'none' && cs.visibility !== 'hidden'});
                }
            }
            return hits;
        }""")
    finally:
        browser.close()
print(json.dumps(out, indent=1))

#!/usr/bin/env python3
"""After the vessels.json edit: prove the junk card's ground-tackle row renders
the new sentence verbatim in-page, and report its viewport position."""
import json, sys
from playwright.sync_api import sync_playwright

NEEDLE = "matching the 1.49 m measured off the"

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship&s=junk",
                  wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = page.evaluate("""(needle) => {
            const hits = [];
            const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (walk.nextNode()) {
                const t = walk.currentNode.textContent;
                if (t && t.includes('Ground tackle')) {
                    const el = walk.currentNode.parentElement;
                    const row = el.closest('tr') || el.parentElement;
                    const txt = (row ? row.textContent : el.textContent) || '';
                    const r = el.getBoundingClientRect();
                    hits.push({top: r.top, bottom: r.bottom,
                               hasNeedle: txt.includes(needle),
                               tail: txt.slice(-220)});
                }
            }
            return hits;
        }""", NEEDLE)
    finally:
        browser.close()
print(json.dumps(out, ensure_ascii=False, indent=1))
ok = any(h["hasNeedle"] for h in out)
below_fold = all(h["top"] > 900 for h in out)
print(f"needle rendered: {ok}; all instances below 900px fold: {below_fold}",
      file=sys.stderr)
sys.exit(0 if ok else 1)

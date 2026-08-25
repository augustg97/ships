#!/usr/bin/env python3
"""Fetch and eval /survey-hulls.js in the live page, print crudestFirst rows as JSON lines.
Usage: "$STUDIO/.venv/bin/python" build/staging/run_survey_r146.py [outfile]
"""
import json, sys

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=60000)
            page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
            out = page.evaluate(
                "async () => { const s = await (await fetch('/survey-hulls.js')).text();"
                " return (0, eval)(s); }")
        finally:
            browser.close()
    rows = out.get("crudestFirst", [])
    text = "\n".join(json.dumps(r) for r in rows)
    if len(sys.argv) > 1:
        open(sys.argv[1], "w").write(text + "\n")
    print(text)
    return 0

if __name__ == "__main__":
    sys.exit(main())

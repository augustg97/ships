#!/usr/bin/env python3
"""r192: run the audit (optionally with an injection) against the :8151 shadow."""
import json, sys

def main():
    inject = open(sys.argv[1]).read() if len(sys.argv) > 1 else None
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.goto("http://127.0.0.1:8149/?frozen=1#v=ship", wait_until="load", timeout=60000)
            page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
            if inject:
                page.evaluate(inject)
            out = page.evaluate(
                "async () => { const s = await (await fetch('/audit-hulls.js')).text();"
                " return (0, eval)(s); }")
        finally:
            browser.close()
    print(json.dumps(out.get("problems", []), indent=1))
    print(f"checked {len(out.get('rows', []))} hulls, "
          f"{len(out.get('problems', []))} problems", file=sys.stderr)

if __name__ == "__main__":
    sys.exit(main())

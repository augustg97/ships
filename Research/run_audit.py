#!/usr/bin/env python3
"""Run Research/audit-hulls.js inside the live page and print the result.

  "$STUDIO/.venv/bin/python" Research/run_audit.py

Needs the :8149 server; the audit file must be synced to web/ first (it is fetched
from the page's own origin so the page CSP stays untouched).
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
                "async () => { const s = await (await fetch('/audit-hulls.js')).text();"
                " return (0, eval)(s); }")
        finally:
            # r125: a timeout here leaked a GPU process at 650% CPU that poisoned
            # every timing taken after it. The browser dies with the run, always.
            browser.close()
    print(json.dumps(out.get("problems", []), indent=1))
    ok = sum(1 for r in out.get("rows", []))
    print(f"checked {ok} hulls, {len(out.get('problems', []))} problems", file=sys.stderr)
    return 1 if out.get("problems") else 0

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Run the audit with a fault injected first — the proof that a rule can fire.

  "$STUDIO/.venv/bin/python" Research/run_audit_inject.py <inject.js>

The snippet runs in the page BEFORE the audit is fetched and eval'd. It can wrap
SHIPS_HULL.buildShip (build injection) or edit APP.vessels (data injection). Needs
the :8149 server; the audit must be synced to web/ first. ⚠ If the snippet MOVES a
group after build, it must call g.updateMatrixWorld(true) — the r67 lesson: Box3
refreshes the mesh's own matrix but trusts the parent's.
"""
import json, sys

def main():
    inject = open(sys.argv[1]).read()
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=60000)
            page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
            page.evaluate(inject)
            out = page.evaluate(
                "async () => { const s = await (await fetch('/audit-hulls.js')).text();"
                " return (0, eval)(s); }")
        finally:
            # r125: a timeout here leaked a GPU process at 650% CPU that poisoned
            # every timing taken after it. The browser dies with the run, always.
            browser.close()
    print(json.dumps(out.get("problems", []), indent=1))
    print(f"checked {len(out.get('rows', []))} hulls, "
          f"{len(out.get('problems', []))} problems", file=sys.stderr)

if __name__ == "__main__":
    sys.exit(main())

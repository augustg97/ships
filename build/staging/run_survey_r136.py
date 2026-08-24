import json, sys
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
json.dump(out, open("build/staging/survey-r136.json", "w"), indent=1)
for h in out["crudestFirst"]:
    gr = [b for b in h.get("boxyParts", []) if "grating" in str(b)]
    if gr or h.get("floating"):
        print(h["id"], gr, "boxPct", h.get("boxPct"), "floating", h.get("floating"))
print("hulls:", len(out["crudestFirst"]), file=sys.stderr)

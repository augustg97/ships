"""r149 diag — the Yamato pagoda close-up, two bearings, cropped to the tower.
Usage: "$STUDIO/.venv/bin/python" build/diag-r149-tower.py <suffix>
Writes build/staging/r149-tower-b90-<suffix>.png and ...-b40-<suffix>.png
"""
import sys
from playwright.sync_api import sync_playwright

SUF = sys.argv[1] if len(sys.argv) > 1 else "x"

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 2000, "height": 1300},
                                device_scale_factor=1)
        page.goto("http://localhost:8149/?frozen=1#v=ship&s=yamato",
                  wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        page.wait_for_timeout(600)
        page.evaluate("() => { for (const el of document.querySelectorAll("
                      "'.panel,.card,#psgCard,.hud,.tabs,header,footer')) "
                      "el.style.visibility = 'hidden'; }")
        page.evaluate("(fov) => { SW.cam.fov = fov; SW.cam.updateProjectionMatrix(); }", 2.2)
        for name, deg, lat in [("b0", 0, 0.06), ("b25", 25, 0.06)]:
            page.evaluate("([deg, lat]) => { SW.viewFromDeg = deg; SW.lat = lat; }",
                          [deg, lat])
            page.wait_for_timeout(500)
            page.evaluate("""() => { const d = SW.fit * SW.dist;
              SW.cam.near = Math.max(SW.cam.near, d * 0.3);
              SW.cam.updateProjectionMatrix(); }""")
            page.wait_for_timeout(200)
            page.screenshot(path=f"build/staging/r149-tower-{name}-{SUF}-full.png")
    finally:
        browser.close()

from PIL import Image
for name in ("b0", "b25"):
    im = Image.open(f"build/staging/r149-tower-{name}-{SUF}-full.png")
    w, h = im.size
    # the pagoda stands amidships-forward and tall: upper band, centre-forward third
    im.crop((int(w * 0.33), int(h * 0.04), int(w * 0.67), int(h * 0.60))) \
      .save(f"build/staging/r149-tower-{name}-{SUF}.png")
    print(f"build/staging/r149-tower-{name}-{SUF}.png")

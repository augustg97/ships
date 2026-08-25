import pathlib, sys
from playwright.sync_api import sync_playwright

SHIP = sys.argv[1] if len(sys.argv) > 1 else "panokseon"
TAG = sys.argv[2] if len(sys.argv) > 2 else "after"
out = pathlib.Path(f"build/staging/clamp-r143/{SHIP}-{TAG}")
out.mkdir(parents=True, exist_ok=True)
# name, bearing deg, lat, dist, aimY — aimed at the deck-lip band
shots = [("clamp-b090", 90, 0.10, 0.42, 3.6),
         ("clamp-b065", 65, 0.12, 0.38, 3.6),
         ("clamp-b115", 115, 0.12, 0.38, 3.6)]
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--force-color-profile=srgb", "--disable-lcd-text"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    pg.goto(f"http://localhost:8149/?frozen=1#v=ship&s={SHIP}&sail=furled",
            wait_until="load", timeout=60000)
    pg.wait_for_function("window.__FRAME_READY === true && "
                         "(!document.fonts || document.fonts.status === 'loaded')",
                         timeout=60000)
    pg.wait_for_timeout(600)
    for name, deg, lat, z, y in shots:
        pg.evaluate("([d,l,z,y]) => { SW.shipSpin = d*Math.PI/180; SW.lat = l;"
                    " if (z !== null) SW.dist = z; if (y !== null) SW.aimY = y; }",
                    [deg, lat, z, y])
        pg.wait_for_timeout(400)
        pg.screenshot(path=str(out / f"{name}.png"), type="png")
        print(name)
    b.close()

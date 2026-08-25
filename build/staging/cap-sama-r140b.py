import pathlib
from playwright.sync_api import sync_playwright
out = pathlib.Path("build/staging/sama-r140"); out.mkdir(parents=True, exist_ok=True)
shots = [("wall2-b090",      90, 0.08, 0.50, 3.4),
         ("wall2-b090-mid",  90, 0.06, 0.36, 3.5),
         ("wall2-b065",      65, 0.08, 0.42, 3.4),
         ("wall2-b115",     115, 0.08, 0.42, 3.4),
         ("wall2-high",      90, 0.50, 0.45, 3.0),
         ("wall2-b270",     270, 0.10, 0.60, 3.0)]
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--force-color-profile=srgb", "--disable-lcd-text"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    pg.goto("http://localhost:8149/?frozen=1#v=ship&s=sekibune&sail=furled",
            wait_until="load", timeout=60000)
    pg.wait_for_function("window.__FRAME_READY === true && (!document.fonts || document.fonts.status === 'loaded')", timeout=60000)
    pg.wait_for_timeout(600)
    for name, deg, lat, z, y in shots:
        pg.evaluate("([d,l,z,y]) => { SW.shipSpin = d*Math.PI/180; SW.lat = l;"
                    " if (z !== null) SW.dist = z; if (y !== null) SW.aimY = y; }",
                    [deg, lat, z, y])
        pg.wait_for_timeout(400)
        pg.screenshot(path=str(out / f"{name}.png"), type="png")
        print(name)
    b.close()

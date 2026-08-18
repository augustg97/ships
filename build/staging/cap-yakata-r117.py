import pathlib
from playwright.sync_api import sync_playwright
out = pathlib.Path("build/staging/yakata-r117"); out.mkdir(parents=True, exist_ok=True)
shots = [("furl-b090-low", 90, 0.02, None, None),
         ("furl-b135",    135, 0.16, None, None),
         ("furl-b045",     45, 0.16, None, None),
         ("furl-b180",    180, 0.10, None, None),
         ("furl-close-090",90, 0.08, 0.28, 4.2),
         ("furl-close-235",235, 0.10, 0.30, 4.2)]
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

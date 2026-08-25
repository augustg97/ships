import pathlib
from playwright.sync_api import sync_playwright
out = pathlib.Path("build/staging/sama-r140"); out.mkdir(parents=True, exist_ok=True)
# name, bearing deg, lat, dist, aimY — the r117/r139 close-up grammar
shots = [("wall-b090-close", 90, 0.06, 0.22, 3.5),   # broadside, the row dead-on
         ("wall-b065-obl",   65, 0.06, 0.20, 3.5),   # oblique fore — reveal depth
         ("wall-b115-obl",  115, 0.06, 0.20, 3.5),   # oblique aft — reveal depth
         ("wall-b090-high",  90, 0.45, 0.30, 3.2),   # over the wall — inboard read
         ("wall-b270-far",  270, 0.10, 0.55, 3.0)]   # the other side, whole row
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

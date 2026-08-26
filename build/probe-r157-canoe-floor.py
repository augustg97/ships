#!/usr/bin/env python3
"""r157: pick the frozen time for the canoe-floor watching frame.

Loads `/?frozen=T#e=4&f=aotearoa&fb=160&fd=80&fz=25` at each candidate T, reads the slip
card's own Position/Course/Nearest-land rows off the DOM, prints them beside the subsolar
longitude (0.006*T rad east), and screenshots each so the pick is made by looking.
Needs :8149 and an idle renderer (never concurrent with the ratchet)."""
import sys, math

TS = [float(t) for t in (sys.argv[1:] or [553, 1600, 2647, 3694, 4741, 5788])]

from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--force-color-profile=srgb", "--disable-lcd-text"])
    for T in TS:
        page = browser.new_page(viewport={"width": 1440, "height": 900},
                                device_scale_factor=2)
        url = f"http://localhost:8149/?frozen={T}#e=4&f=aotearoa&fb=160&fd=80&fz=25"
        page.goto(url, wait_until="load", timeout=60000)
        page.wait_for_function(
            "window.__FRAME_READY === true && (!document.fonts || document.fonts.status === 'loaded')",
            timeout=60000)
        page.wait_for_timeout(900)
        rows = page.evaluate("""() => {
            const q = s => { const e = document.querySelector(s); return e ? e.textContent : null; };
            return { pos: q('.pc-pos'), crs: q('.pc-crs'), land: q('.pc-land'),
                     voy: q('.pc-voy') };
        }""")
        sub = (math.degrees(0.006 * T)) % 360.0
        sub_pm = sub if sub <= 180 else sub - 360
        out = f"build/staging/r157/probe-t{int(T)}.png"
        page.screenshot(path=out, type="png")
        print(f"t={T:7.1f}  subsolar {sub_pm:8.2f}E  pos={rows['pos']}  crs={rows['crs']}  "
              f"land={rows['land']}  voy={rows['voy']}")
        page.close()
    browser.close()

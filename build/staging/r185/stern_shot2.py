#!/usr/bin/env python3
"""r185: stern shot with the DOM panels hidden — diagnostic only, never a frame.
Usage: stern_shot2.py out.png [b z l y sail]."""
import sys
from playwright.sync_api import sync_playwright

out = sys.argv[1]
b_, z_, l_, y_ = (sys.argv[2:6] + ["168", "0.30", "15", "11"][len(sys.argv) - 2:])[:4]
sail = sys.argv[6] if len(sys.argv) > 6 else "furled"

with sync_playwright() as pw:
    br = pw.chromium.launch()
    try:
        p = br.new_page(viewport={"width": 1440, "height": 900})
        p.goto(f"http://localhost:8149/?frozen=1#v=ship&s=treasure-ship"
               f"&b={b_}&z={z_}&l={l_}&y={y_}&sail={sail}",
               wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        p.evaluate("""() => {
          for (const id of ['shipwright','readout','rail','voyages','eras','tabs','labels'])
            { const el = document.getElementById(id); if (el) el.remove(); }
        }""")
        p.wait_for_timeout(500)
        p.screenshot(path=out)
    finally:
        br.close()
print("wrote", out)

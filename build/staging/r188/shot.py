#!/usr/bin/env python3
"""r188: shoot the treasure-ship through the b/z/l/y hash grammar (the addressable
camera — r55/r184: the controller owns SW.cam every frame).
Usage: shot.py out.png [b z l y sail]. Needs :8149."""
import sys
from playwright.sync_api import sync_playwright

out = sys.argv[1]
b_, z_, l_, y_ = (sys.argv[2:6] + ["150", "0.42", "18", "7"][len(sys.argv) - 2:])[:4]
sail = sys.argv[6] if len(sys.argv) > 6 else "furled"

with sync_playwright() as pw:
    br = pw.chromium.launch()
    try:
        p = br.new_page(viewport={"width": 1440, "height": 900})
        p.goto(f"http://localhost:8149/?frozen=1#v=ship&s=treasure-ship"
               f"&b={b_}&z={z_}&l={l_}&y={y_}&sail={sail}",
               wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        p.wait_for_timeout(700)
        p.screenshot(path=out)
    finally:
        br.close()
print("wrote", out)

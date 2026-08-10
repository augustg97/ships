#!/usr/bin/env python3
"""Capture a close-up three ways — as-is, land hidden, sea hidden — to attribute
each pixel band at the waterline to the surface that draws it. Round 65."""
import sys

FRAG = sys.argv[1] if len(sys.argv) > 1 else '#e=2&f=syracuse'

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1" + FRAG, wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=90000)
        page.screenshot(path="/tmp/ls_both.png")
        page.evaluate("() => { SHIPS_PSG.PSG.land.userData.hold = true; }")
        # the frame loop re-shows land each tick in descent mode; hide via scale instead
        page.evaluate("() => { SHIPS_PSG.PSG.land.scale.setScalar(1e-6); }")
        page.wait_for_timeout(300)
        page.screenshot(path="/tmp/ls_noland.png")
        page.evaluate("() => { SHIPS_PSG.PSG.land.scale.setScalar(1); "
                      "SHIPS_PSG.PSG.sea.scale.setScalar(1e-6); }")
        page.wait_for_timeout(300)
        page.screenshot(path="/tmp/ls_nosea.png")
        browser.close()
    print("saved /tmp/ls_both.png /tmp/ls_noland.png /tmp/ls_nosea.png")

if __name__ == "__main__":
    main()

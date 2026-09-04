#!/usr/bin/env python3
"""Capture ONE frame of the app at an arbitrary URL fragment — the diagnosis companion to
spin_capture (which owns the fixed 12-bearing survey) and the frame ratchet (which owns the
committed baselines). Use for close-ups the Shipwright's camera grammar can name: `b=` the
bearing she is seen from (0 ahead, 90 abeam, 150 the stern quarter, 180 astern), `z=` the
distance as a multiple of the fit (0.35 closest), `l=` the height angle in degrees, `y=` the
height looked at in metres over the waterline, and `x=` the point looked at ALONG the hull in
the loft's own metres from amidships, aft positive (r220: without it a close zoom always
framed amidships, and a 180 m yacht's stern stood outside the lens):

  "$STUDIO/.venv/bin/python" Research/url_capture.py \
      --frag '#v=ship&s=azzam&b=150&z=0.35&l=10&y=5&x=75' --bare --out /tmp/azzam-stern.png

Needs the :8149 server. Frozen time, same ready expr as the harness."""
import argparse, sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frag", required=True, help="URL fragment, starting with #")
    ap.add_argument("--out", required=True)
    ap.add_argument("--url", default="http://localhost:8149")
    ap.add_argument("--settle-ms", type=int, default=900)
    ap.add_argument("--bare", action="store_true",
                    help="hide the UI chrome so a low subject is not behind a panel")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright
    url = f"{args.url}/?frozen=1{args.frag}"
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--force-color-profile=srgb",
                                           "--disable-lcd-text"])
        page = browser.new_page(viewport={"width": 1440, "height": 900},
                                device_scale_factor=2)
        page.goto(url, wait_until="load", timeout=60000)
        page.wait_for_function(
            "window.__FRAME_READY === true && (!document.fonts || document.fonts.status === 'loaded')",
            timeout=60000)
        page.wait_for_timeout(args.settle_ms)
        if args.bare:
            page.add_style_tag(content=
                ".panel,#tabs,#eras,#labels,#swLeft,#swBuild,#swList,#swFleet,#swNav,"
                "#swLabels,#swRuler{visibility:hidden !important}")
            page.wait_for_timeout(150)
        page.screenshot(path=args.out, type="png")
        browser.close()
    print(f"→ {args.out}")

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Spin a Shipwright hull and capture it from all round — the survey that caught the
carrier's timber rudder and floating flight deck (round 25), made repeatable.

The frame ratchet watches ONE bearing per ship; a fault behind the hull is invisible to it
by construction. This walks SW.shipSpin through eight bearings at the default camera height
and four at a low one (a floating deck reads as sky through a gap only from low down).

  "$STUDIO/.venv/bin/python" Research/spin_capture.py --ship container
  → Research/baselines/_spin/container/{b000,b045,...,low000,low090,...}.png

Needs the :8149 server. Frozen time, same ready expr as the harness.
"""
import argparse, pathlib, sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ship", required=True)
    ap.add_argument("--url", default="http://localhost:8149")
    ap.add_argument("--out", default=None)
    ap.add_argument("--settle-ms", type=int, default=700)
    args = ap.parse_args()

    out = pathlib.Path(args.out or
        pathlib.Path(__file__).parent / "baselines" / "_spin" / args.ship)
    out.mkdir(parents=True, exist_ok=True)

    from playwright.sync_api import sync_playwright
    url = f"{args.url}/?frozen=1#v=ship&s={args.ship}"
    shots = [("b%03d" % (d), d, None) for d in range(0, 360, 45)] + \
            [("low%03d" % (d), d, 0.02) for d in range(0, 360, 90)]

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--force-color-profile=srgb",
                                           "--disable-lcd-text"])
        page = browser.new_page(viewport={"width": 1440, "height": 900},
                                device_scale_factor=2)
        page.goto(url, wait_until="load", timeout=60000)
        page.wait_for_function(
            "window.__FRAME_READY === true && (!document.fonts || document.fonts.status === 'loaded')",
            timeout=60000)
        page.wait_for_timeout(600)
        for name, deg, lat in shots:
            # spin is a plain rotation applied every rendered frame; frozen pins the
            # CLOCKS, not the render loop, so a new value shows up next frame
            page.evaluate(
                "([deg, lat]) => { SW.shipSpin = deg * Math.PI / 180;"
                " if (lat !== null) SW.lat = lat; else SW.lat = 0.16; }",
                [deg, lat])
            page.wait_for_timeout(args.settle_ms)
            page.screenshot(path=str(out / f"{name}.png"), type="png")
            print(f"  {name}.png  bearing {deg}°" + (f"  lat {lat}" if lat is not None else ""))
        browser.close()
    print(f"→ {out}")

if __name__ == "__main__":
    sys.exit(main())

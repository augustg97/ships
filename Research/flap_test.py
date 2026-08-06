#!/usr/bin/env python3
"""Determinism probe: capture the same frame N times in FRESH pages and diff the runs
against each other — not against the baseline. Separates a one-time settle (runs agree,
baseline is stale) from a live flap (runs disagree with each other).

  "$STUDIO/.venv/bin/python" Research/flap_test.py descent globe-default
"""
import json, pathlib, sys

FRAMES = {f["name"]: f["path"]
          for f in json.load(open(pathlib.Path(__file__).parent / "baselines" / "frames.json"))["frames"]}
READY = ("window.__FRAME_READY === true && "
         "(!document.fonts || document.fonts.status === 'loaded')")

def main():
    names = sys.argv[1:] or ["descent"]
    out = pathlib.Path(__file__).parent / "baselines" / "_flap"
    out.mkdir(exist_ok=True)
    from playwright.sync_api import sync_playwright
    import numpy as np
    from PIL import Image
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--force-color-profile=srgb", "--disable-lcd-text"])
        for name in names:
            caps = []
            for run in (1, 2):
                page = browser.new_page(viewport={"width": 1440, "height": 900},
                                        device_scale_factor=2)
                page.goto("http://localhost:8149" + FRAMES[name],
                          wait_until="load", timeout=60000)
                page.wait_for_function(READY, timeout=60000)
                page.wait_for_timeout(600)
                p = out / f"{name}-r{run}.png"
                page.screenshot(path=str(p))
                page.close()
                caps.append(p)
            a = np.asarray(Image.open(caps[0]).convert("RGB"), dtype=np.int16)
            b = np.asarray(Image.open(caps[1]).convert("RGB"), dtype=np.int16)
            d = np.abs(a - b)
            changed = float((d.max(axis=2) > 8).mean())
            print(f"{name:16s} run1-vs-run2: changed {changed*100:.3f}%  mean|d| {d.mean():.3f}")
        browser.close()

if __name__ == "__main__":
    main()

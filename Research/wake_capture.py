#!/usr/bin/env python3
"""Capture the close-up wake from a named bearing — the follow camera the URL cannot
address. Boards a voyage with #f=, waits for the frame gate, then sets the follow
camera's own state (S.followAz / S.followDep / S.followDist) and lets the frame loop
apply it. Diagnosis frames only: nothing here is a baseline, because the address is
not in the URL. Round 111, the wake due-diligence pass.

  "$STUDIO/.venv/bin/python" Research/wake_capture.py --frag '#e=7&f=boxroute' \
      --az 235 --dep 55 --dist 2600 --out build/wake-r111/box-quarter.png

az   compass bearing you stand on FROM her (0 = you are dead ahead of her)
dep  degrees of depression, 4..84 (84 is nearly plan view)
dist stand-off in metres, clamped by the app at 2600
"""
import argparse, sys

JS = """
([azDeg, dep, dist]) => {
  if (typeof S === 'undefined' || !S.follow) return 'no follow';
  /* placeCamera puts the camera's ground point on bearing (followAz + PI) from her,
     as a TRUE compass bearing (cos->lat, sin->lon). Standing on compass bearing B
     from her therefore means followAz = (B - 180) degrees. Verified: az 235 under the
     old -B mapping resolved to standing dead ahead of a 305-course ship. */
  S.followAz = (azDeg - 180) * Math.PI / 180;
  S.followDep = dep;
  S.followDist = dist;
  return 'ok';
}
"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--frag', required=True)
    ap.add_argument('--az', type=float, required=True)
    ap.add_argument('--dep', type=float, default=45.0)
    ap.add_argument('--dist', type=float, default=1500.0)
    ap.add_argument('--out', required=True)
    ap.add_argument('--bare', action='store_true')
    ap.add_argument('--settle-ms', type=int, default=1200)
    a = ap.parse_args()

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1" + a.frag, wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=90000)
        r = page.evaluate(JS, [a.az, a.dep, a.dist])
        if r != 'ok':
            print('FAILED:', r, file=sys.stderr); browser.close(); return 1
        if a.bare:
            page.evaluate("""() => { for (const el of document.querySelectorAll(
              'body > div, body > nav, body > header')) if (!el.querySelector('canvas'))
              el.style.display = 'none'; }""")
        page.wait_for_timeout(a.settle_ms)
        page.screenshot(path=a.out)
        browser.close()
        print('->', a.out)
        return 0

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Time the frozen boot to FRAME_READY, N fresh browsers, printing APP.boot each run.

  "$STUDIO/.venv/bin/python" Research/time-boot-r126.py [url] [n]

Needs the :8149 server. These are harness numbers (headless chromium) — good for an
A/B delta on identical conditions, not for absolute user-facing time. The r125 lesson
stands: the browser dies with the run, always, or the leak poisons every later number.
"""
import json, sys, time


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8149/?frozen=1"
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    from playwright.sync_api import sync_playwright
    times = []
    for i in range(n):
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            try:
                page = browser.new_page(viewport={"width": 1440, "height": 900})
                t0 = time.monotonic()
                page.goto(url, wait_until="load", timeout=240000)
                page.wait_for_function("window.__FRAME_READY === true", timeout=240000)
                dt = time.monotonic() - t0
                # APP is a top-level `const` in a classic script: a global lexical
                # binding, not a window property — window.APP is undefined.
                boot = page.evaluate("typeof APP !== 'undefined' && APP.boot || null")
                times.append(dt)
                print(f"run {i + 1}: {dt:.1f} s   APP.boot: {json.dumps(boot)}")
            finally:
                browser.close()
    times.sort()
    print(f"sorted: {['%.1f' % t for t in times]}  median {times[len(times) // 2]:.1f} s")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""r245: open a page and print its console errors and page errors, waiting up to 90 s for FRAME_READY."""
import sys, os
from playwright.sync_api import sync_playwright
URL = os.environ.get('AUDIT_URL', 'http://localhost:8150'); frag = sys.argv[1] if len(sys.argv) > 1 else '#v=ship&s=carrack'
with sync_playwright() as pw:
    b = pw.chromium.launch(); p = b.new_page(viewport={'width': 1440, 'height': 900})
    errs = []
    p.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    p.on('console', lambda m: errs.append(m.type + ' ' + m.text) if m.type in ('error', 'warning') else None)
    p.goto(f'{URL}/?frozen=1{frag}', wait_until='load', timeout=90000)
    try:
        p.wait_for_function('window.__FRAME_READY === true', timeout=150000); print('FRAME_READY ok')
    except Exception as e: print('FRAME_READY timeout')
    for e in errs[:20]: print(e[:600])
    b.close()

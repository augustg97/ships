# capture the same frozen paths from web/ (:8149) and docs/ (:8151), log page errors, diff the pixels
import sys, time, os
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
outd = sys.argv[1]; os.makedirs(outd, exist_ok=True)
paths = [('globe', '/?frozen=1#v=sea')]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for name, path in paths:
        for port in (8149, 8151):
            pg = b.new_page(viewport={'width': 1440, 'height': 900})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.on('console', lambda m: errs.append('console ' + m.text[:200]) if m.type == 'error' else None)
            pg.goto(f'http://localhost:{port}{path}')
            ok = False
            for i in range(75):
                time.sleep(2)
                if pg.evaluate('window.__FRAME_READY === true'): ok = True; break
            time.sleep(3)
            pg.screenshot(path=f'{outd}/{name}-{port}.png')
            print(name, port, 'ready' if ok else 'NOT READY', 'errors:', errs[:4], flush=True)
            pg.close()
        a = Image.open(f'{outd}/{name}-8149.png').convert('RGB'); c = Image.open(f'{outd}/{name}-8151.png').convert('RGB')
        d = ImageChops.difference(a, c).convert('L'); h = d.histogram(); n = sum(h); ch = sum(h[6:])
        print(name, 'changed_frac', round(ch / n, 5), flush=True)
    b.close()

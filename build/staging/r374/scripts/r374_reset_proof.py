"""r374 proof: abort the first request for one level-2 tile with ERR_CONNECTION_RESET,
on HEAD's app.js/route.js/battle.js (served from before/) and on the new ones."""
import sys, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
D = Path('/Users/augustgweon/Ships/build/staging/r374')
FRAG = sys.argv[1] if len(sys.argv) > 1 else '/?frozen=1#e=2&f=syracuse'
TAG = sys.argv[2] if len(sys.argv) > 2 else 'coast'
TILE = 'fields/z2/5_1.png'
out = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for variant in ('before', 'after'):
        for fault in ('none', 'reset'):
            ctx = b.new_context(viewport={'width': 1440, 'height': 900})
            pg = ctx.new_page()
            state = {'aborted': 0}
            if variant == 'before':
                for js in ('app', 'route', 'battle'):
                    body = (D / 'before' / (js + '.js')).read_text()
                    def mk(body):
                        return lambda r: r.fulfill(status=200, body=body, content_type='application/javascript')
                    pg.route(f'**/js/{js}.js*', mk(body))
            if fault == 'reset':
                def h(r):
                    if state['aborted'] == 0:
                        state['aborted'] += 1; r.abort('connectionreset')
                    else: r.continue_()
                pg.route('**/' + TILE, h)
            t0 = time.time()
            pg.goto('http://localhost:8149' + FRAG, wait_until='commit', timeout=120000)
            try:
                pg.wait_for_function('window.__FRAME_READY === true', timeout=150000); ready = True
            except Exception: ready = False
            pg.wait_for_timeout(1500)
            info = pg.evaluate('() => ({level: APP.level, maskFine: APP.maskFineLevel, faults: APP.fetchFaults || null})')
            f = D / f'proof-{TAG}-{variant}-{fault}.png'
            pg.screenshot(path=str(f))
            out[f'{variant}/{fault}'] = dict(ready=ready, aborted=state['aborted'], s=round(time.time()-t0,1), **info)
            print(variant, fault, out[f'{variant}/{fault}'], flush=True)
            ctx.close()
    b.close()
ref = Image.open(D / f'proof-{TAG}-after-none.png').convert('RGB')
for k in out:
    im = Image.open(D / f"proof-{TAG}-{k.replace('/', '-')}.png").convert('RGB')
    d = ImageChops.difference(ref, im).convert('L')
    n = sum(1 for v in d.getdata() if v > 8)
    print(f'{k:14s} vs after/none: {100*n/(ref.width*ref.height):.3f}% of pixels')

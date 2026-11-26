import sys, time, os
from playwright.sync_api import sync_playwright
# usage: r339_witness.py <outdir> <tag> frag1 name1 frag2 name2 ...
outd, tagn = sys.argv[1], sys.argv[2]; args = sys.argv[3:]
os.makedirs(outd, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for frag, name in zip(args[0::2], args[1::2]):
        pg = b.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=2)
        pg.goto(os.environ.get('WURL', 'http://localhost:8150') + f'/index.html?frozen{frag}')
        ok = False
        for i in range(75):
            time.sleep(2)
            if pg.evaluate('window.__FRAME_READY === true'): ok = True; break
        time.sleep(2)
        pg.add_style_tag(content='* { visibility: hidden !important; } canvas { visibility: visible !important; }')
        time.sleep(1)
        out = f'{outd}/{name}-{tagn}.png'
        pg.screenshot(path=out)
        print(name, tagn, 'ready' if ok else 'NOT READY', (i+1)*2, 's', flush=True)
        pg.close()
    b.close()

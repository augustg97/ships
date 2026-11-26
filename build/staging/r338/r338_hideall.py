import sys, time, io
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
frag = sys.argv[1]; boxes = [(1440,1060,1525,1150), (1745,1100,1790,1165)]
def cut(png): im = Image.open(io.BytesIO(png)).convert('RGB'); return [im.crop(b) for b in boxes]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True); pg = b.new_page(viewport={'width':1440,'height':900}, device_scale_factor=2)
    pg.goto('http://localhost:8150/?frozen=1' + frag)
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    time.sleep(4); base = cut(pg.screenshot())
    keys = pg.evaluate("""() => { const s = new Set(); SW.ship.traverse(o => { let pt = null; for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { pt = e.userData.part; break; } s.add(pt ? pt.key : '?'); }); return [...s]; }""")
    for k in keys:
        pg.evaluate("""(k) => { SW.ship.traverse(o => { let pt = null; for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { pt = e.userData.part; break; } if ((pt ? pt.key : '?') === k && o !== SW.ship && !o.isGroup) { o.userData.__v = o.visible; o.visible = false; } }); }""", k)
        time.sleep(0.6); now = cut(pg.screenshot())
        n = [sum(1 for v in ImageChops.difference(a, c).convert('L').getdata() if v > 20) for a, c in zip(base, now)]
        if any(n): print(k, n, flush=True)
        pg.evaluate("""(k) => { SW.ship.traverse(o => { if (o.userData.__v !== undefined) { o.visible = o.userData.__v; delete o.userData.__v; } }); }""", k)
    b.close()

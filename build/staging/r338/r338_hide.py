import sys, time
from playwright.sync_api import sync_playwright
frag, keys = sys.argv[1], sys.argv[2:]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True); pg = b.new_page(viewport={'width':1440,'height':900}, device_scale_factor=2)
    pg.goto('http://localhost:8150/?frozen=1' + frag)
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    time.sleep(4); pg.screenshot(path='hide-none.png')
    for k in keys:
        pg.evaluate("""(k) => { SW.ship.traverse(o => { let pt = null; for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { pt = e.userData.part; break; }
            o.userData.__hid = o.userData.__hid || false; if (o.isMesh && pt && pt.key === k) o.visible = false; }); }""", k)
        time.sleep(2); pg.screenshot(path=f'hide-{k}.png')
        pg.evaluate("""(k) => { SW.ship.traverse(o => { let pt = null; for (let e = o; e; e = e.parent) if (e.userData && e.userData.part) { pt = e.userData.part; break; } if (o.isMesh && pt && pt.key === k) o.visible = true; }); }""", k)
    b.close()

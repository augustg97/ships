import sys, time
from playwright.sync_api import sync_playwright
frag, out, url = sys.argv[1], sys.argv[2], sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True); pg = b.new_page(viewport={'width':1440,'height':900}, device_scale_factor=2)
    pg.goto(url + '/index.html?frozen' + frag)
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    time.sleep(4)
    pg.evaluate("""() => { SW.ship.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.key === 'wale') { o.material = o.material.clone(); o.material.color.set(0xff0000); o.material.emissive && o.material.emissive.set(0x660000); o.material.needsUpdate = true; } }); }""")
    time.sleep(2); pg.screenshot(path=out); b.close()

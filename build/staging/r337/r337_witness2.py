import sys, time
from playwright.sync_api import sync_playwright
frag, out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=2)
    import os
    pg.goto(os.environ.get('WURL', 'http://localhost:8150') + f'/index.html?frozen{frag}')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    time.sleep(2)
    for k in range(30):
        time.sleep(1)
        if pg.evaluate("(() => { try { return !!(SW.ship && SW.ship.getObjectsByProperty && SW.ship.getObjectsByProperty('isMesh', true).some(o => o.userData.part && o.userData.part.key === 'wale')); } catch (e) { return false; } })()"): break
    time.sleep(3)
    print('fine after', k + 1, 's')
    pg.screenshot(path=out)
    print('ready after', (i+1)*2, 's ->', out)
    b.close()

import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(headless=True); pg=b.new_page(viewport={'width':1440,'height':900}, device_scale_factor=2)
    pg.goto('http://localhost:8150/index.html?frozen#v=ship&s=fluyt&b=90&l=8&z=1.0')
    for i in range(75):
        time.sleep(2)
        if pg.evaluate('window.__FRAME_READY === true'): break
    time.sleep(3)
    pg.evaluate("""() => { SW.ship.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.key === 'wale') { o.material = o.material.clone(); o.material.color.set(0xff0000); o.material.side = THREE.DoubleSide; o.material.needsUpdate = true; o.material.emissive && o.material.emissive.set(0x660000); } }); }""")
    time.sleep(2); pg.screenshot(path='exp-dbl.png')
    pg.evaluate("""() => { SW.ship.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.key === 'planking') o.visible = false; }); }""")
    time.sleep(2); pg.screenshot(path='exp-dbl-noplank.png')
    b.close()

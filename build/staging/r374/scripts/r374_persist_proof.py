from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':1440,'height':900})
    pg.route('**/fields/z2/5_1.png', lambda r: r.abort('connectionreset'))
    pg.goto('http://localhost:8149/?frozen=1#e=2&f=syracuse', wait_until='commit', timeout=120000)
    try: pg.wait_for_function('window.__FRAME_READY === true', timeout=45000); ready=True
    except Exception: ready=False
    print('ready', ready, pg.evaluate('() => ({level: APP.level, faults: APP.fetchFaults})'))
    b.close()

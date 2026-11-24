"""r302: read every hull's Shipwright stage cards (0-7) off the page, and shoot the card at chosen stages."""
import json, sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1]; OUT = sys.argv[2]; SHOTS = sys.argv[3].split(',') if len(sys.argv) > 3 else []
res = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--force-color-profile=srgb", "--disable-lcd-text"])
    try:
        pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        pg.goto(BASE + "/?frozen=1#v=ship&s=titanic", wait_until="load", timeout=90000)
        pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
        ids = pg.evaluate("() => (APP.vessels.vessels || APP.vessels).map(v => v.id)")
        for vid in ids:
            pg.evaluate("(id) => swOpenById(id)", vid); pg.wait_for_timeout(400)
            cards = []
            for st in range(8):
                cards.append(pg.evaluate("(st) => { SW.stage = st; document.getElementById('swStage').value = st; swApplyStage(); return [document.getElementById('swStageName').textContent, document.getElementById('swStageWhat').textContent]; }", st))
            res[vid] = cards
            if vid in SHOTS:
                for st in (3, 4, 6, 7):
                    pg.evaluate("(st) => { SW.stage = st; document.getElementById('swStage').value = st; swApplyStage(); }", st)
                    pg.wait_for_timeout(500)
                    pg.screenshot(path=OUT.replace('.json', f'-{vid}-s{st}.png'))
    finally: b.close()
json.dump(res, open(OUT, 'w'), indent=1, ensure_ascii=False)

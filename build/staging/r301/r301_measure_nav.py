import sys, json
from playwright.sync_api import sync_playwright
BASE=sys.argv[1]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    try:
        pg=b.new_page(viewport={"width":1440,"height":900})
        out={}
        for s in sys.argv[2].split(','):
            pg.goto(BASE+f"/?frozen=1#v=ship&s={s}",wait_until="load",timeout=90000)
            pg.wait_for_function("window.__FRAME_READY === true",timeout=150000)
            out[s]=pg.evaluate("""() => { const r = id => { const q = document.getElementById(id).getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map(x => +x.toFixed(2)); };
              return { build: r('swBuild'), nav: r('swNav'), prev: r('swPrev'), furl: r('swFurl'), what: document.getElementById('swStageWhat').textContent.slice(0,60) }; }""")
        print(json.dumps(out,indent=1))
    finally: b.close()

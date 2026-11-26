"""r350: screenshot the 74's card rows on a given origin. usage: r350_card.py <origin> <out.png>"""
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(sys.argv[1] + '/index.html?frozen#v=ship&s=ship-of-the-line')
        await pg.wait_for_function('window.__FRAME_READY === true', timeout=150000)
        await pg.wait_for_timeout(1500)
        txt = await pg.evaluate("document.getElementById('swRows').innerText")
        print(txt[-1400:])
        await pg.evaluate("document.getElementById('swRows').scrollIntoView({block:'end'})")
        await pg.wait_for_timeout(500)
        el = await pg.query_selector('#swRows')
        await el.screenshot(path=sys.argv[2])
        await pg.screenshot(path=sys.argv[2].replace('.png', '-full.png'))
        print('errors:', errs)
        await b.close()
asyncio.run(main())

#!/usr/bin/env python3
"""One-off: open the corbita in the Shipwright, click her windlass barrel (projected
through SW.cam), screenshot the part card with the Roman sentence."""
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship&s=corbita", wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        pt = page.evaluate("""() => {
            const SW = SHIPS_SW.SW, cam = SW.cam;
            const cands = [];
            const scenes = [];
            for (const k in SW) { const v = SW[k]; if (v && v.isScene) scenes.push(v); }
            const root = scenes[0] || (cam.parent);
            const all = [];
            (root || cam.parent).traverse(o => { if (o.isMesh && o.name === 'win-barrel') all.push(o); });
            for (const m of all) {
                const p = new THREE.Vector3();
                m.getWorldPosition(p);
                const n = p.clone().project(cam);
                cands.push({x: (n.x*0.5+0.5), y: (-n.y*0.5+0.5), z: n.z, d: Math.hypot(n.x, n.y)});
            }
            cands.sort((a,b) => a.d - b.d);
            return {n: all.length, best: cands[0] || null};
        }""")
        print("barrels found:", pt)
        if pt and pt["best"]:
            cvbox = page.evaluate("""() => {
                const cv = document.querySelector('canvas');
                const r = cv.getBoundingClientRect();
                return {x:r.x, y:r.y, w:r.width, h:r.height};
            }""")
            cx = cvbox["x"] + pt["best"]["x"] * cvbox["w"]
            cy = cvbox["y"] + pt["best"]["y"] * cvbox["h"]
            print("clicking", cx, cy)
            page.mouse.click(cx, cy)
            page.wait_for_timeout(700)
            got = page.evaluate("""() => {
                const els = [...document.querySelectorAll('*')];
                const el = els.find(e => e.children.length === 0 && /Piraeus/.test(e.textContent||''));
                return el ? (el.textContent||'').slice(0,200) : null;
            }""")
            print("card text with Piraeus:", (got or "NOT SHOWN")[:200])
            page.screenshot(path="build/staging/r177/z-corbita-parts-card.png")
    finally:
        browser.close()

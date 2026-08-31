import json
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch()
    page = b.new_page(viewport={"width":1440,"height":900})
    page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=60000)
    page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
    out = page.evaluate("""() => {
      const res = {};
      for (const v of (APP.vessels.vessels || APP.vessels)) {
        const H = v.hull; if (!H || !H.sternLights) continue;
        const HS = SHIPS_HULL.hullSurface(H);
        const fb = HS.sheer(1.0);
        const xF = SHIPS_HULL.surfacePoint(H, HS, 1.0, 1.0)[0];
        const atH = zH => SHIPS_HULL.surfacePoint(H, HS, 1.0,
            0.62 + 0.38 * Math.max(0, Math.min(1, zH / fb)));
        const rows = H.sternLights, rowZ = [];
        for (let r = 0; r < rows; r++)
          rowZ.push(fb * (rows === 1 ? 0.55 : 0.42 + 0.30 * r));
        res[v.id] = { beam: H.beam, fb, xF,
          tiers: rowZ.map(zc => ({ zc, half: Math.abs(atH(zc)[2]) })) };
      }
      return res;
    }""")
    b.close()
print(json.dumps(out, indent=1))

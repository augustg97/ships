#!/usr/bin/env python3
"""r156 probe: count zero-length vertex normals per mesh, fleet-wide.

The both-ways index trick (duplicated opposite-winding triangles SHARING vertices)
makes computeVertexNormals sum every shared vertex to zero length. This measures
how many meshes carry cancelled normals and at what fraction, so the audit rule's
threshold is chosen on evidence rather than guessed.
"""
import json, sys

JS = """
async () => {
  const list = APP.vessels.vessels || APP.vessels;
  const out = [];
  for (const v of list) {
    if (!v.hull) continue;
    let g;
    try { g = SHIPS_HULL.buildShip(v.hull, { fine: true }); }
    catch (e) { out.push({ id: v.id, error: e.message }); continue; }
    const tagOf = o => { for (let e = o; e; e = e.parent)
                           if (e.userData && e.userData.part) return e.userData.part;
                         return null; };
    g.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const n = o.geometry.attributes.normal;
      if (!n) return;
      const a = n.array; let bad = 0; const tot = a.length / 3;
      for (let i = 0; i < a.length; i += 3) {
        const l2 = a[i]*a[i] + a[i+1]*a[i+1] + a[i+2]*a[i+2];
        if (l2 < 0.25) bad++;
      }
      if (bad > 0) {
        const p = tagOf(o);
        out.push({ id: v.id, part: (p && (p.name || p.key)) || o.geometry.type,
                   key: (p && p.key) || '?', bad, tot,
                   frac: +(bad / tot).toFixed(3),
                   basic: !!(o.material && o.material.isMeshBasicMaterial) });
      }
    });
  }
  return out;
}
"""

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=60000)
            page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
            out = page.evaluate(JS)
        finally:
            browser.close()
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    sys.exit(main())

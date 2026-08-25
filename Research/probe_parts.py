"""Per-part box probe, name any hull's boxy classes exactly (written r145 for the carrier).
Usage: "$STUDIO/.venv/bin/python" Research/probe_parts.py carrier [outfile]
"""
import json, sys
from playwright.sync_api import sync_playwright

SHIP = sys.argv[1] if len(sys.argv) > 1 else "carrier"
OUT = sys.argv[2] if len(sys.argv) > 2 else f"build/staging/probe-{SHIP}.json"

JS = """
async (ship) => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const v = list.find(x => x.id === ship);
  const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
  g.updateMatrixWorld(true);
  const tagOf = o => { for (let e = o; e; e = e.parent)
                         if (e.userData && e.userData.part) return e.userData.part; return null; };
  const byKey = {};
  const byName = {};
  g.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    const geo = o.geometry;
    const tris = geo.index ? geo.index.count / 3
               : (geo.attributes.position ? geo.attributes.position.count / 3 : 0);
    const p = tagOf(o) || {};
    const key = p.key || '?';
    const e = byKey[key] || (byKey[key] = { n: 0, boxy: 0, tris: 0 });
    e.n++; e.tris += tris;
    if (tris <= 12) {
      e.boxy++;
      const nm = key + '/' + (p.name || '?');
      byName[nm] = (byName[nm] || 0) + 1;
    }
  });
  return { byKey, byName };
}
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"http://localhost:8149/?frozen=1#v=ship&s={SHIP}",
                  wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = page.evaluate(JS, SHIP)
    finally:
        browser.close()

json.dump(out, open(OUT, "w"), indent=1)
print(f"== {SHIP}: boxy meshes by part/name ==")
for nm, n in sorted(out["byName"].items(), key=lambda kv: -kv[1]):
    print(f"{n:4d}x  {nm}")
print("-- all part kinds --")
for k, e in sorted(out["byKey"].items(), key=lambda kv: -kv[1]["boxy"]):
    print(f"{k:14s} n={e['n']:4d} boxy={e['boxy']:4d} tris={e['tris']:6.0f}")
tot = sum(e["n"] for e in out["byKey"].values())
box = sum(e["boxy"] for e in out["byKey"].values())
print(f"total {tot} meshes, {box} boxy ({100*box//tot}%)")

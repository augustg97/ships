import json, sys
from playwright.sync_api import sync_playwright

JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const v = list.find(x => x.id === 'panokseon');
  const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
  g.updateMatrixWorld(true);
  const tagOf = o => { for (let e = o; e; e = e.parent)
                         if (e.userData && e.userData.part) return e.userData.part; return null; };
  const byKey = {};
  const boxes = [];
  g.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    const geo = o.geometry;
    const tris = geo.index ? geo.index.count / 3
               : (geo.attributes.position ? geo.attributes.position.count / 3 : 0);
    const key = (tagOf(o) || {}).key || '?';
    const e = byKey[key] || (byKey[key] = { n: 0, boxy: 0, tris: 0 });
    e.n++; e.tris += tris;
    if (tris <= 12) {
      e.boxy++;
      const b = new THREE.Box3().setFromObject(o);
      const s = b.getSize(new THREE.Vector3());
      boxes.push({ key, name: o.name || '', tris,
                   dims: [ +s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2) ],
                   ctr: [ +((b.min.x+b.max.x)/2).toFixed(2),
                          +((b.min.y+b.max.y)/2).toFixed(2),
                          +((b.min.z+b.max.z)/2).toFixed(2) ] });
    }
  });
  return { byKey, boxes };
}
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship&s=panokseon",
                  wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = page.evaluate(JS)
    finally:
        browser.close()

json.dump(out, open("build/staging/probe-panokseon-r141.json", "w"), indent=1)
rows = sorted(out["byKey"].items(), key=lambda kv: -kv[1]["boxy"])
print(f"{'part':22s} {'meshes':>6s} {'boxy':>5s} {'tris':>7s}")
for k, e in rows:
    if e["boxy"]:
        print(f"{k:22s} {e['n']:6d} {e['boxy']:5d} {e['tris']:7.0f}")
print("--- box dims histogram (key: dims rounded) ---", file=sys.stderr)
from collections import Counter
c = Counter((b["key"], tuple(b["dims"])) for b in out["boxes"])
for (k, d), n in c.most_common(30):
    print(f"{n:4d}x  {k:20s} {d}", file=sys.stderr)

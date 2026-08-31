"""Per-mesh survey of the great-eastern paddle group, in hull space."""
import json
from playwright.sync_api import sync_playwright

JS = """
() => {
  const ent = SW.layout.find(e => e.id === SW.spec.id);
  const root = ent.obj;
  const org = new THREE.Vector3();
  root.getWorldPosition(org);
  const out = [];
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh) return;
    let anc = o, tagged = null;
    while (anc && anc !== root) { if (anc.userData && anc.userData.tagKey) { tagged = anc.userData.tagKey; break; } anc = anc.parent; }
    // fall back: group by walking up for a name
    const box = new THREE.Box3().setFromObject(o);
    box.min.sub(org); box.max.sub(org);
    const g = o.geometry;
    const tris = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    out.push({
      name: o.name || (o.parent && o.parent.name) || '',
      tag: tagged,
      geo: g.type, tris,
      min: box.min.toArray().map(v => +v.toFixed(2)),
      max: box.max.toArray().map(v => +v.toFixed(2)),
    });
  });
  return out;
}
"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        p = b.new_page(viewport={"width": 900, "height": 600})
        p.goto("http://localhost:8149/?frozen=1#v=ship&s=great-eastern",
               wait_until="load", timeout=60000)
        p.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        rows = p.evaluate(JS)
    finally:
        b.close()

print("total meshes:", len(rows))
# the starboard wheel: meshes wholly outboard of the hull side, below the box ribs
wheel = [r for r in rows if r["min"][2] > 11.5 and r["max"][2] < 21.5]
from collections import Counter
kinds = Counter(r["geo"] for r in wheel)
print("starboard wheel meshes by geometry:", dict(kinds))
import math
for geo in kinds:
    sub = [r for r in wheel if r["geo"] == geo]
    xs = [v for r in sub for v in (r["min"][0], r["max"][0])]
    ys = [v for r in sub for v in (r["min"][1], r["max"][1])]
    zs = [v for r in sub for v in (r["min"][2], r["max"][2])]
    dims = sorted(set((round(r["max"][0]-r["min"][0],2), round(r["max"][1]-r["min"][1],2),
                       round(r["max"][2]-r["min"][2],2)) for r in sub))
    print(f'  {geo}: n={len(sub)} x[{min(xs):.2f},{max(xs):.2f}] y[{min(ys):.2f},{max(ys):.2f}] '
          f'z[{min(zs):.2f},{max(zs):.2f}]')
    for d in dims[:6]: print('     dims', d)

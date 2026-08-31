"""Fleet-wide box probe sweep (r168): every hull, one page, ranked by boxy count.

A mesh is boxy at <= 12 triangles (probe_parts.py's r145 criterion). One page load,
every hull built in it with { fine: true } — the probe reads geometry, not pixels,
so no navigation per ship is needed.

Usage: "$STUDIO/.venv/bin/python" build/staging/r168/probe-sweep.py [outfile]
"""
import json, sys
from playwright.sync_api import sync_playwright

OUT = sys.argv[1] if len(sys.argv) > 1 else "build/staging/r168/sweep.json"

JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!v.hull) { out[v.id] = { error: 'no hull record' }; continue; }
    let g;
    try { g = SHIPS_HULL.buildShip(v.hull, { fine: true }); }
    catch (e) { out[v.id] = { error: String(e) }; continue; }
    g.updateMatrixWorld(true);
    const tagOf = o => { for (let e = o; e; e = e.parent)
                           if (e.userData && e.userData.part) return e.userData.part; return null; };
    const byKey = {}, byName = {};
    let meshes = 0, boxy = 0, tris = 0;
    g.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const geo = o.geometry;
      const t = geo.index ? geo.index.count / 3
              : (geo.attributes.position ? geo.attributes.position.count / 3 : 0);
      const p = tagOf(o) || {};
      const key = p.key || '?';
      const e = byKey[key] || (byKey[key] = { n: 0, boxy: 0, tris: 0 });
      e.n++; e.tris += t; meshes++; tris += t;
      if (t <= 12) {
        e.boxy++; boxy++;
        const nm = key + '/' + (p.name || '?');
        byName[nm] = (byName[nm] || 0) + 1;
      }
    });
    const lwl = (v.hull && v.hull.lwl) || 0;
    out[v.id] = { meshes, boxy, tris, lwl, byKey, byName };
  }
  return out;
}
"""

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship&s=dugout",
                  wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=120000)
        out = page.evaluate(JS)
    finally:
        browser.close()

json.dump(out, open(OUT, "w"), indent=1)

rows = []
for sid, e in out.items():
    if "error" in e:
        rows.append((sid, None, e["error"]))
        continue
    rows.append((sid, e, None))

print(f"== fleet sweep: {len(rows)} hulls, boxy = meshes at <=12 tris ==")
print(f"{'ship':18s} {'meshes':>7s} {'boxy':>5s} {'%':>4s}  worst part classes (all-boxy, n>=2)")
ranked = sorted((r for r in rows if r[1]), key=lambda r: -r[1]["boxy"])
for sid, e, _ in ranked:
    pct = 100 * e["boxy"] // max(1, e["meshes"])
    worst = sorted(((k, d) for k, d in e["byKey"].items()
                    if d["n"] >= 2 and d["boxy"] == d["n"]),
                   key=lambda kd: -kd[1]["boxy"])[:3]
    ws = ", ".join(f"{k}:{d['boxy']}" for k, d in worst)
    print(f"{sid:18s} {e['meshes']:7d} {e['boxy']:5d} {pct:3d}%  {ws}")
for sid, _, err in rows:
    if err: print(f"{sid:18s} ERROR {err}")

print()
print("== top boxy part/name entries fleet-wide ==")
agg = {}
for sid, e, _ in ranked:
    for nm, n in e["byName"].items():
        agg[(nm)] = agg.get(nm, 0) + n
for nm, n in sorted(agg.items(), key=lambda kv: -kv[1])[:25]:
    print(f"{n:5d}x  {nm}")

#!/usr/bin/env python3
"""What the model ACTUALLY measures, part by part, in metres — against what the record claims.

A profile plate answers "does this look right". It cannot answer "is she 26 m too long",
because the eye has no scale bar. This walks the built hull's own scene graph, takes the
bounding box of every tagged part in HULL SPACE (x forward-negative from midships, y above
the load waterline, z half-breadth), and prints it in metres beside the record.

  "$STUDIO/.venv/bin/python" Research/measure_ship.py --ship queen-mary-2

Needs the :8149 server.
"""
import argparse, json, sys

MEASURE = """() => {
  if (typeof SW === 'undefined' || !SW.spec) return {err: 'no spec'};
  const S = SW.spec, hull = S.hull;
  const e = (SW.layout || []).find(en => en.id === S.id);
  if (!e) return {err: 'no layout entry'};
  const root = e.obj;
  const prev = root.rotation.y; root.rotation.y = 0; root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const parts = {};
  const bbAll = new THREE.Box3();
  root.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.visible) return;
    const g = o.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = new THREE.Box3().copy(g.boundingBox);
    b.applyMatrix4(o.matrixWorld).applyMatrix4(inv);
    bbAll.union(b);
    // walk up for the nearest tagged ancestor
    let name = null;
    for (let p = o; p; p = p.parent) {
      if (p.userData && p.userData.part) { name = (p.userData.part.name || p.userData.part.key); break; }
      if (p.name && p.name !== '') { name = p.name; break; }
    }
    name = name || '(untagged)';
    const q = parts[name] || (parts[name] = new THREE.Box3().makeEmpty());
    q.union(b);
  });
  const dump = b => ({x0: +b.min.x.toFixed(2), x1: +b.max.x.toFixed(2),
                      y0: +b.min.y.toFixed(2), y1: +b.max.y.toFixed(2),
                      z1: +b.max.z.toFixed(2)});
  const out = {name: S.name, id: S.id, lwl: hull.lwl, loa: hull.loa, beam: hull.beam,
               draught: hull.draught, all: dump(bbAll), parts: {}};
  for (const k in parts) if (!parts[k].isEmpty()) out.parts[k] = dump(parts[k]);
  root.rotation.y = prev; root.updateMatrixWorld(true);
  return out;
}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ship", required=True)
    ap.add_argument("--url", default="http://localhost:8149")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright
    url = f"{args.url}/?frozen=1#v=ship&s={args.ship}"
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1200, "height": 800})
        page.goto(url, wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        page.wait_for_timeout(900)
        r = page.evaluate(MEASURE)
        browser.close()

    if r.get("err"):
        print("ERROR:", r["err"]); return 1
    lwl, loa = r["lwl"], r["loa"]
    a = r["all"]
    print(f'{r["name"]}   record: LOA {loa} m  LWL {lwl} m  beam {r["beam"]} m  draught {r["draught"]} m')
    print(f'  model extent   x {a["x0"]:+8.2f} .. {a["x1"]:+8.2f}   = {a["x1"]-a["x0"]:7.2f} m'
          f'   (record LOA {loa})   Δ {a["x1"]-a["x0"]-loa:+.2f} m')
    print(f'  model height   y {a["y0"]:+8.2f} .. {a["y1"]:+8.2f}   = {a["y1"]-a["y0"]:7.2f} m'
          f'   above water {a["y1"]:.2f} m')
    print(f'  model breadth  z         .. {a["z1"]:+8.2f}   = {2*a["z1"]:7.2f} m'
          f'   (record beam {r["beam"]})   Δ {2*a["z1"]-r["beam"]:+.2f} m')
    # u is the hull surface's parameter: x = (u − 0.5)·lwl
    def u(x): return x / lwl + 0.5
    print(f'\n  {"part":26} {"u fore":>7} {"u aft":>7} {"len m":>7} {"y0":>7} {"y1":>7} {"half":>6}')
    for k in sorted(r["parts"], key=lambda k: r["parts"][k]["x0"]):
        p = r["parts"][k]
        print(f'  {k[:26]:26} {u(p["x0"]):7.3f} {u(p["x1"]):7.3f} {p["x1"]-p["x0"]:7.2f}'
              f' {p["y0"]:7.2f} {p["y1"]:7.2f} {p["z1"]:6.2f}')
    return 0


if __name__ == "__main__":
    sys.exit(main())

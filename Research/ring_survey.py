#!/usr/bin/env python3
"""Ring survey of the oared hulls — the r86 carried item.

Fires horizontal ray rings at each hull's own declared walls, from all round:
  TOPSIDE ring: 72 bearings x 3 heights in the metre above the waterline, aimed at
    midship. Every ray must strike the ship — a hull side you can see through is the
    winding fault the deckhouse ring caught on the steamers (26 of 72 bearings, r-early).
  WORKS ring: 72 bearings x 3 heights inside the gun-deck wall's OWN vertical band
    (Bulwark / End bulwark / Screen meshes), aimed at the wall box centre. Reports the
    through bearings and what, if anything, the ray reached instead.

Diagnosis only — prints numbers; the audit learns whatever class this convicts.

  "$STUDIO/.venv/bin/python" Research/ring_survey.py [ids...]
"""
import json, sys

SURVEY = """
async (ids) => {
  const out = [];
  for (const id of ids) {
    const v = (APP.vessels.vessels || APP.vessels).find(x => x.id === id);
    if (!v || !v.hull) { out.push({ id, error: 'no hull' }); continue; }
    let g;
    try { g = SHIPS_HULL.buildShip(v.hull, { fine: true }); }
    catch (e) { out.push({ id, error: e.message }); continue; }
    g.updateMatrixWorld(true);
    const partOf = o => { for (let e = o; e; e = e.parent)
      if (e.userData && e.userData.part) return e.userData.part; return null; };

    const WALL = ['Bulwark', 'End bulwark', 'Screen'];
    const wb = new THREE.Box3(); wb.makeEmpty(); let walls = 0;
    const sb = new THREE.Box3(); sb.makeEmpty();
    g.traverse(o => {
      if (!o.isMesh) return;
      const p = partOf(o);
      if (p && WALL.includes(p.name)) { wb.expandByObject(o); walls++; }
      if (p && p.key === 'planking') sb.expandByObject(o);
    });

    const rc = new THREE.Raycaster();
    const ring = (cx, cz, y) => {
      const misses = [];
      for (let b = 0; b < 72; b++) {
        const th = b * Math.PI / 36;
        rc.set(new THREE.Vector3(cx + Math.cos(th) * 400, y, cz + Math.sin(th) * 400),
               new THREE.Vector3(-Math.cos(th), 0, -Math.sin(th)).normalize());
        rc.far = 900;
        const h = rc.intersectObject(g, true);
        if (!h.length) misses.push({ deg: Math.round(th * 180 / Math.PI), hit: 'nothing' });
      }
      return misses;
    };

    const row = { id, walls };

    /* topside: the metre above the waterline, amidships. Every hull here has more
       freeboard than that, so every bearing must strike the shell. */
    const top = [];
    for (const y of [0.3, 0.6, 0.9]) top.push(...ring(0, 0, y).map(m => ({ ...m, y })));
    row.topside = { shot: 216, through: top.length, sample: top.slice(0, 6) };

    /* works: inside the declared wall's own band, aimed at the wall box centre */
    if (v.hull.gunDeck) {
      if (!walls) row.works = { error: 'gunDeck declared, no wall meshes' };
      else {
        const cx = (wb.min.x + wb.max.x) / 2, cz = (wb.min.z + wb.max.z) / 2;
        const H = wb.max.y - wb.min.y, ys = [0.25, 0.5, 0.8].map(f => wb.min.y + H * f);
        const th2 = [];
        for (const y of ys) th2.push(...ring(cx, cz, y).map(m => ({ ...m, y: +y.toFixed(2) })));
        row.works = { band: [+wb.min.y.toFixed(2), +wb.max.y.toFixed(2)],
                      shot: 216, through: th2.length,
                      sample: th2.filter((_, i) => i % Math.ceil(th2.length / 12 || 1) === 0) };
      }
    }
    out.push(row);
  }
  return out;
}
"""

def main():
    ids = sys.argv[1:] or ["galley", "galleass", "panokseon", "sekibune"]
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
        out = page.evaluate(SURVEY, ids)
        browser.close()
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    sys.exit(main())

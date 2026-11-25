"""r322: mast feet, segment heads and the lateen crossing on the 1590-1700 hulls, set build."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2]
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!['fluyt'].includes(v.id)) continue;
    const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
    g.updateMatrixWorld(true);
    const segs = {}, lat = [], course = [], tops = [];
    g.traverse(o => {
      if (o.userData.part && o.userData.part.key === 'top' && o.userData.part.name === 'Top') tops.push({ x: +o.position.x.toFixed(3), y: +o.position.y.toFixed(3) });
      if (!o.isMesh) return;
      const sg = o.userData.seg;
      if (sg) {
        const h = o.geometry.parameters && o.geometry.parameters.height;
        let foot = null;
        if (h) { const a = new THREE.Vector3(0, -h/2, 0).applyMatrix4(o.matrixWorld), b = new THREE.Vector3(0, h/2, 0).applyMatrix4(o.matrixWorld);
          foot = a.y < b.y ? [a.x, a.y] : [b.x, b.y]; }
        (segs[sg.mi] = segs[sg.mi] || [])[sg.si] = { footY: +sg.footY.toFixed(3), headY: +sg.headY.toFixed(3), footX: foot ? +foot[0].toFixed(3) : null };
      }
      if (o.userData.courseAt) { const c = o.userData.courseAt; course.push({ mast: c.mast, y: +o.position.y.toFixed(3), base: +c.base.toFixed(3), from: c.from, x: +(o.userData.slung ? o.userData.slung.axisX : o.position.x).toFixed(3) }); }
      if (o.userData.lateen && o.userData.lateen.mast === 2) { const L = o.userData.lateen;
        lat.push({ slingY: L.slingY, baseY: L.baseY, d2t: L.d2t, slingOfD2T: L.slingOfD2T, mastHeadY: L.mastHeadY, spacing: L.spacing }); }
    });
    const masts = v.hull.masts.map((mk, mi) => {
      const sg = (segs[mi] || []).filter(Boolean);
      return { at: mk.at, rig: mk.rig, only: mk.only, nseg: sg.length, footX: sg.length ? sg[0].footX : null, footY: sg.length ? sg[0].footY : null,
               heads: sg.map(s => +(s.headY - sg[0].footY).toFixed(3)), MH: mk.mastHeightsM || null };
    });
    out[v.id] = { masts, lateen: lat, course, tops };
  }
  return out;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    try:
        pg = b.new_page(viewport={"width": 800, "height": 600})
        pg.goto(URL + "/?frozen=1#v=ship", wait_until="load", timeout=90000)
        pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
        res = pg.evaluate(JS)
    finally: b.close()
json.dump(res, open(OUT, 'w'), indent=1)
for k, r in res.items():
    print(k)
    for m in r['masts']: print('  ', json.dumps(m))
    for y in r['lateen']: print('   lateen', json.dumps(y))
    for c in r['course']:
        t=min(r['tops'],key=lambda t:abs(t['x']-c['x'])); print('   course', json.dumps(c), 'top', json.dumps(t), 'share %.3f'%((c['y']-c['base'])/(t['y']-c['base'])))

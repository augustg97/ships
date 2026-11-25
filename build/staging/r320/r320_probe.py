"""r320: the mizzen (mast 2) of the East Indiaman and the slave ship, set build: segments, square yards, lateen yard."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2]
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const out = {};
  for (const v of list) {
    if (!['east-indiaman','slave-ship'].includes(v.id)) continue;
    const r = {};
    for (const furled of [false, true]) {
      const g = SHIPS_HULL.buildShip(v.hull, { fine: true, furled });
      g.updateMatrixWorld(true);
      const segs = [], yards = [], lat = [], sails = [];
      const bb = new THREE.Box3();
      g.traverse(o => { if (!o.isMesh) return; const u = o.userData;
        if (u.seg && u.seg.mi === 2) segs.push([u.seg.si, +u.seg.footY.toFixed(2), +u.seg.headY.toFixed(2)]);
        if (u.lateen) lat.push({ slingY: u.lateen.slingY, mastHeadY: u.lateen.mastHeadY, headroom: u.lateen.headroom, mastX: u.lateen.mastX });
        if (u.slung && !u.lateen) { bb.setFromObject(o); yards.push({ mastX: u.slung.mastX, y: +o.getWorldPosition(new THREE.Vector3()).y.toFixed(2),
            len: +(bb.max.z - bb.min.z).toFixed(2), name: u.part && u.part.name, courseAt: u.courseAt ? { frac: +u.courseAt.frac.toFixed(3), from: u.courseAt.from } : null,
            lowered: u.lowered ? u.lowered.name : null, bare: !!u.bare }); }
        if (u.part && u.part.key === 'sail') { bb.setFromObject(o); if (bb.min.x > -999) sails.push({ name: u.part.name, x0: +bb.min.x.toFixed(1), x1: +bb.max.x.toFixed(1), y0: +bb.min.y.toFixed(2), y1: +bb.max.y.toFixed(2) }); }
      });
      const mx = lat.length ? lat[0].mastX : null;
      r[furled ? 'furled' : 'set'] = { segs: segs.sort(), lateen: lat,
        yards: yards.filter(y => mx !== null && Math.abs(y.mastX - mx) < 0.6).sort((a, b) => a.y - b.y),
        sails: sails.filter(s => mx !== null && s.x1 > mx - 4) };
    }
    out[v.id] = r;
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
    for mode, q in r.items():
        print('##', k, mode, 'segs', q['segs'], 'lateen', q['lateen'])
        for y in q['yards']: print('   yard', y)
        for s in q['sails']: print('   sail', s)

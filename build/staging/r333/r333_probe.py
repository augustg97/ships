"""r333: the fluyt's built mast feet (stations), the lateen yard's ends, and the mizzen's top."""
import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; URL = sys.argv[2]
JS = """
async () => {
  const list = (APP.vessels.vessels || APP.vessels) || [];
  const v = list.find(x => x.id === 'fluyt'); const H = v.hull;
  const hs = SHIPS_HULL.hullSurface(H), Lh = H.lwl;
  const stX = u => (u - 0.5) * Lh + hs.rake(u);
  const xs = H.masts.map(m => stX(m.at));
  const out = { at: H.masts.map(m => m.at), stX: xs.map(x => +x.toFixed(3)),
    mainShare: +((xs[1] - xs[0]) / (xs[2] - xs[0])).toFixed(4), foreMizzen: +(xs[2] - xs[0]).toFixed(3) };
  const g = SHIPS_HULL.buildShip(H, { fine: true }); g.updateMatrixWorld(true);
  g.traverse(o => { if (!o.isMesh) return;
    if (o.userData.lateen && !o.userData.lateen.furled) {
      const hh = o.geometry.parameters.height;
      const e1 = new THREE.Vector3(0, -hh / 2, 0).applyMatrix4(o.matrixWorld), e2 = new THREE.Vector3(0, hh / 2, 0).applyMatrix4(o.matrixWorld);
      const lo = e1.y < e2.y ? e1 : e2, hi = e1.y < e2.y ? e2 : e1;
      out.lateen = { len: +hh.toFixed(3), heel: [+lo.x.toFixed(3), +lo.y.toFixed(3)], peak: [+hi.x.toFixed(3), +hi.y.toFixed(3)],
        angle: +(Math.atan2(hi.y - lo.y, Math.abs(hi.x - lo.x)) * 180 / Math.PI).toFixed(2), ud: o.userData.lateen };
    }
    if (o.userData.seg) (out.segs = out.segs || []).push({ mi: o.userData.seg.mi, si: o.userData.seg.si, foot: +o.userData.seg.footY.toFixed(3), head: +o.userData.seg.headY.toFixed(3) });
  });
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
print(json.dumps(res)[:2500])

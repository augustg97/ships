import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]
JS = """() => { const out = {};
 for (const v of (APP.vessels.vessels || APP.vessels)) { if (!v.hull || !(v.hull.masts || []).some(m => m.rig === 'lateen' || m.lateenMizzen)) continue;
  const r = {};
  for (const furled of [false, true]) {
   const g = SHIPS_HULL.buildShip(v.hull, { fine: true, furled }); g.updateMatrixWorld(true);
   const L = [], O = [], SH = [];
   g.traverse(o => { if (!o.isMesh) return; if (o.userData.lateen) L.push({mast: o.userData.lateen.mast, clew: o.userData.lateen.clew, sheet: o.userData.lateen.sheet});
     if (o.userData.outlicker) O.push(o.userData.outlicker); if (o.userData.lateenSheet) SH.push(o.userData.lateenSheet); });
   r[furled ? 'furled' : 'set'] = { L, O, SH };
  }
  out[v.id] = r; }
 return out; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=90000)
    pg.wait_for_function("window.__FRAME_READY === true", timeout=150000)
    r = pg.evaluate(JS); b.close()
print('page errors', errs[:3])
json.dump(r, open(OUT, 'w'), indent=0)
for k, v in r.items():
    print('##', k)
    for st in ('set', 'furled'):
        for l in v[st]['L']: print(' ', st, l)
        for o in v[st]['O']: print(' ', st, 'OUTLICKER', {q: o[q] for q in ('xIn','xOut','y','z','r','len','past','mast')})
        print(' ', st, 'sheets', v[st]['SH'])

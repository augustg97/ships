// usage: node r373_probe.js <webdir> ; prints each catted hull's cathead seat and its stow
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2], ONLY = process.argv[3];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels; ctx.__ONLY = ONLY;
vm.runInContext(`
for (const V of __V) { if (!V.hull || !V.hull.bowsprit) continue; if (__ONLY && V.id !== __ONLY) continue;
  const S = V.hull; let g; try { g = SHIPS_HULL.buildShip(S, { fine: true }); } catch (e) { console.log(V.id, 'ERR', e.stack); continue; }
  g.updateMatrixWorld(true);
  const H = SHIPS_HULL.hullSurface(S);
  const out = { id: V.id };
  g.traverse(o => {
    if (o.isGroup && o.userData.part && o.userData.part.key === 'cathead' && !out.cat) {
      let lo = 1e9, hi = -1e9, xmin = 1e9, xmax = -1e9; const P = new THREE.Vector3();
      o.traverse(m => { if (!m.isMesh) return; const a = m.geometry.attributes.position; for (let i = 0; i < a.count; i++) { P.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld); lo = Math.min(lo, P.y); hi = Math.max(hi, P.y); xmin = Math.min(xmin, P.x); xmax = Math.max(xmax, P.x); } });
      out.cat = { lo: +lo.toFixed(3), hi: +hi.toFixed(3), x: [+xmin.toFixed(2), +xmax.toFixed(2)] };
    }
    if (o.userData.anchorStow && !out.stow) { const s = o.userData.anchorStow; out.stow = { under: s.under, tilt: s.tiltDeg, clear: s.stockClear, ring: s.ring, bill: s.bill, crown: s.crown, gun: s.gunwale, board: s.board && { yLo: s.board.yLo, yHi: s.board.yHi, x: s.board.x } }; }
    if (o.userData.lining && !out.lining) out.lining = { yBot: o.userData.lining.yBot, yTop: o.userData.lining.yTop };
  });
  const c = S.__catheads && S.__catheads[0];
  if (c) { const u = 0.1; out.tip = [+c.x.toFixed(3), +c.y.toFixed(3), +c.z.toFixed(3)]; out.seat = c.seat || null; }
  console.log(JSON.stringify(out));
}
`, ctx);

// r370: the bower anchor against the upper-deck ports — which anchor vertices stand over a port opening, on the 74.
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2]; ctx.__ONLY = process.argv[3] || '';
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
for (const V of __V) { if (!V.hull || !V.hull.bowsprit) continue; if (__ONLY && V.id !== __ONLY) continue;
  const S = V.hull; let g; try { g = SHIPS_HULL.buildShip(S, { fine: true }); } catch (e) { console.log(V.id, 'ERR', e.message); continue; }
  g.updateMatrixWorld(true); const H = hullSurface(S);
  const rows = tierPortRows(S), st = tierPortStations(S);
  let stow = null; const pts = [];
  const keyOf = o => { for (let p = o; p; p = p.parent) if (p.userData.part) return p.userData.part; return null; };
  const v = new THREE.Vector3();
  g.traverse(o => { if (o.userData.anchorStow && o.position.z > 0) stow = o.userData.anchorStow; const P = keyOf(o);
    if (o.isMesh && P && P.key === 'anchor' && P.name !== 'Cat pendant') { const a = o.geometry.attributes.position; for (let j = 0; j < a.count; j++) { v.fromBufferAttribute(a, j).applyMatrix4(o.matrixWorld); if (v.z > 0) pts.push([v.x, v.y, v.z]); } } });
  let lining = null, board = null; g.traverse(o => { if (o.userData.lining && o.position.z >= 0 && (!lining || o.userData.lining.bill[2] > 0)) lining = o.userData.lining; if (o.userData.billBoard) board = o.userData.billBoard; });
  // segment samples: dense points between consecutive anchor vertices are not meaningful, so sample the stow's lines
  if (stow) { const A = new THREE.Vector3(...stow.ring), C = new THREE.Vector3(...stow.crown), Bl = new THREE.Vector3(...stow.bill);
    for (let i = 0; i <= 200; i++) { pts.push(A.clone().lerp(C, i / 200).toArray()); pts.push(C.clone().lerp(Bl, i / 200).toArray()); } }
  const out = { id: V.id, stow, lining, board };
  if (stow) { const u = uAtXV(S, H, stow.bill[0], 1, Math.max(0.01, Math.min(0.99, stow.bill[0] / S.lwl + 0.5)));
    out.sheerAtBill = +surfacePoint(S, H, u, 1)[1].toFixed(3);
    out.tiers = rows.map((r, d) => ({ d, yLo: +surfacePoint(S, H, u, r.lo)[1].toFixed(3), yHi: +surfacePoint(S, H, u, r.hi)[1].toFixed(3), from: r.from })); }
  out.anchorBox = pts.length ? [0,1,2].map(i => [+Math.min(...pts.map(p=>p[i])).toFixed(2), +Math.max(...pts.map(p=>p[i])).toFixed(2)]) : null;
  // anchor vertices over a recorded port's opening, per tier
  out.overPorts = [];
  st.forEach((T, d) => { if (!T) return; const r = rows[d];
    T.ports.forEach((p, k) => { const yLo = surfacePoint(S, H, p.u, r.lo)[1], yHi = surfacePoint(S, H, p.u, r.hi)[1];
      const x0 = surfacePoint(S, H, p.uLo, r.port)[0], x1 = surfacePoint(S, H, p.uHi, r.port)[0];
      const n = pts.filter(q => q[0] >= Math.min(x0,x1) && q[0] <= Math.max(x0,x1) && q[1] >= yLo && q[1] <= yHi).length;
      if (k < 3 || n) out.overPorts.push({ tier: d, port: k, x: [+x0.toFixed(2), +x1.toFixed(2)], y: [+yLo.toFixed(2), +yHi.toFixed(2)], anchorVerts: n }); }); });
  console.log(JSON.stringify(out));
}
`, ctx);

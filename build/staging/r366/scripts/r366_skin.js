// r366: every anchor vertex against the hull skin at its own station and height, and against other parts' boxes.
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
for (const V of __V) { if (!V.hull) continue;
  const S = V.hull; let g; try { g = SHIPS_HULL.buildShip(S, { fine: true }); } catch (e) { continue; }
  if (!S.bowsprit) continue;
  g.updateMatrixWorld(true); const H = hullSurface(S), L = S.lwl;
  const keyOf = o => { for (let p = o; p; p = p.parent) if (p.userData.part) return p.userData.part; return null; };
  const v = new THREE.Vector3(); const byAp = {}; const boxes = []; let stow = null;
  g.traverse(o => { const P = keyOf(o); if (o.userData.anchorStow && o.parent && o.parent.isGroup) stow = stow || o.userData.anchorStow;
    if (!o.isMesh || !P) return; const a = o.geometry.attributes.position;
    if (P.key === 'anchor' && P.name !== 'Cat pendant') { const ap = o.userData.ap || '?'; for (let j=0;j<a.count;j++){ v.fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld); if (v.z>0) (byAp[ap] = byAp[ap] || []).push([v.x,v.y,v.z]); } }
    else if (/gun|cathead|channel|deadeye|port|wale|head|rail|lining/i.test(P.key)) { const b = new THREE.Box3().setFromObject(o); if (b.max.z > 0) boxes.push([P.key, b]); } });
  const halfAt = (x, y) => { const u = uAtXV(S, H, x, 0.9, Math.max(0.01, Math.min(0.99, x / L + 0.5))); if (u === null) return null;
    let lo = 0, hi = 1; if (surfacePoint(S,H,u,1)[1] < y) return null; for (let i=0;i<30;i++){ const m=(lo+hi)/2; if (surfacePoint(S,H,u,m)[1] < y) lo=m; else hi=m; } return Math.abs(surfacePoint(S,H,u,(lo+hi)/2)[2]); };
  const res = {};
  for (const ap in byAp) { let worst = 1e9, at = null, n = 0; for (const p of byAp[ap]) { const h = halfAt(p[0], p[1]); if (h === null) continue; const d = p[2] - h; if (d < 0) n++; if (d < worst) { worst = d; at = p.map(q=>+q.toFixed(2)); } } res[ap] = { inside: n, of: byAp[ap].length, worstGap: +worst.toFixed(3), at }; }
  const hits = {}; for (const ap in byAp) for (const p of byAp[ap]) for (const [k, b] of boxes) if (b.containsPoint(new THREE.Vector3(...p))) hits[ap + '>' + k] = (hits[ap + '>' + k] || 0) + 1;
  console.log(V.id, JSON.stringify(res), 'boxhits', JSON.stringify(hits), 'stow', JSON.stringify(stow));
}
`, ctx);

// r372: what stands at the top of the side abaft each cathead: sheer, island top, and any part whose box covers the side there
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
for (const V of __V) { if (!V.hull || !V.hull.bowsprit) continue;
  const S = V.hull; const g = SHIPS_HULL.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
  const H = hullSurface(S), L = S.lwl;
  let stow = null; g.traverse(o => { if (o.userData.anchorStow && o.userData.anchorStow.ring[2] > 0) stow = o.userData.anchorStow; });
  if (!stow) { console.log(V.id, 'no stow'); continue; }
  const x = stow.bill[0];
  const u = uAtXV(S, H, x, 1, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
  const p = surfacePoint(S, H, u, 1), it = H.islandTop(u);
  const keyOf = o => { for (let q = o; q; q = q.parent) if (q.userData.part) return q.userData.part; return null; };
  const hits = {}; const meshes = []; g.traverse(o => { if (!o.isMesh) return; const P = keyOf(o); if (!P || /anchor|anchorLining|shankPainter|catStopper|sheet|brace|stay|halyard|tack|sail|clewline|buntline|shroud|ratline|coil|frames/.test(P.key)) return; meshes.push(o); });
  const rc = new THREE.Raycaster();
  for (const dz of [0.02, 0.1, 0.2, 0.35]) { rc.set(new THREE.Vector3(x, 30, Math.abs(p[2]) - dz), new THREE.Vector3(0, -1, 0)); const I = rc.intersectObjects(meshes, false);
    hits['in' + dz] = I.slice(0, 3).map(i => keyOf(i.object).key + '/' + (keyOf(i.object).name || '') + '@' + i.point.y.toFixed(2)).join(' | '); }
  console.log(V.id, 'billX', x, 'sheer', +p[1].toFixed(2), 'zSide', +Math.abs(p[2]).toFixed(2), 'island', it, 'bill', JSON.stringify(stow.bill), 'tilt', stow.tiltDeg, 'board', JSON.stringify(stow.board));
  for (const k in hits) console.log('   ', k, JSON.stringify(hits[k]));
}
`, ctx);

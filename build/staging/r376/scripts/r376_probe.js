// usage: node r375_probe.js <webdir> — the 74's hawse-holes against her bow, her ports, her head and her bowers
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
for (const ID of ['ship-of-the-line','east-indiaman']) { const V = __V.find(v => v.id === ID); const S = V.hull; console.log('---', ID, JSON.stringify(SHIPS_HULL.hawseCentres(S.hawse)));
const g = SHIPS_HULL.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
const H = SHIPS_HULL.hullSurface(S);
console.log('hawse', JSON.stringify((S.__hawse || []).map(h => ({x:+h.x.toFixed(3), y:+h.y.toFixed(3), z:+h.z.toFixed(3), u:h.u.toFixed(4)}))));
const P = new THREE.Vector3(); const box = {};
g.traverse(o => { if (!o.isMesh) return; let k = null, q = o; while (q && !k) { k = q.userData.part && q.userData.part.key; q = q.parent; }
  const a = o.geometry.attributes.position; if (!a) return;
  for (let i = 0; i < a.count; i++) { P.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); if (P.x > -L0()) continue;
    const b = box[k] = box[k] || {x0:1e9,x1:-1e9,y0:1e9,y1:-1e9,z0:1e9,z1:-1e9};
    b.x0=Math.min(b.x0,P.x);b.x1=Math.max(b.x1,P.x);b.y0=Math.min(b.y0,P.y);b.y1=Math.max(b.y1,P.y);b.z0=Math.min(b.z0,P.z);b.z1=Math.max(b.z1,P.z);} });
function L0() { return S.lwl * 0.5 - 6; }
for (const k in box) { const b = box[k]; console.log('fore part', k, 'x', b.x0.toFixed(2), b.x1.toFixed(2), 'y', b.y0.toFixed(2), b.y1.toFixed(2), 'z', b.z0.toFixed(2), b.z1.toFixed(2)); }
const T = SHIPS_HULL.sideBands ? SHIPS_HULL.sideBands(S) : null;
console.log('lower tier', T ? JSON.stringify(T.tiers[0]) : 'n/a');
for (const u of [0.0, 0.01, 0.02, 0.03, 0.05, 0.08]) { const a = SHIPS_HULL.surfacePoint(S, H, u, 0.62), b = SHIPS_HULL.surfacePoint(S, H, u, 0.75), c = SHIPS_HULL.surfacePoint(S, H, u, 1);
  console.log('u', u, 'v.62', a.map(n=>n.toFixed(2)).join(','), 'v.75', b.map(n=>n.toFixed(2)).join(','), 'v1', c.map(n=>n.toFixed(2)).join(',')); }
}
`, ctx);

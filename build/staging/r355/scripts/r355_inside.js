const vm = require('vm'), fs = require('fs');
const ctx = { console: { log: console.log, warn() {} }, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels, SH = ctx.SHIPS_HULL, THREE = ctx.THREE;
const v = V.find(x => x.id === (process.argv[3] || 'ship-of-the-line')), H = v.hull, HS = SH.hullSurface(H);
const g = SH.buildShip(H, { fine: true }); g.updateMatrixWorld(true);
const atY = y => { let a = 0, b = 1; if (SH.surfacePoint(H, HS, 1, 1)[1] <= y) a = b = 1;
  for (let i = 0; i < 26 && a < b; i++) { const m = (a + b) / 2; if (SH.surfacePoint(H, HS, 1, m)[1] < y) a = m; else b = m; }
  const p = SH.surfacePoint(H, HS, 1, (a + b) / 2); return [p[0], Math.abs(p[2])]; };
const q = new THREE.Vector3();
g.traverse(o => { if (!o.isMesh) return; let key = null; for (let pp = o; pp && !key; pp = pp.parent) key = pp.userData && pp.userData.part && pp.userData.part.key;
  if (key !== 'gallery') return; const a = o.geometry.attributes.position;
  for (let j = 0; j < a.count; j++) { q.fromBufferAttribute(a, j).applyMatrix4(o.matrixWorld); const [xf, hf] = atY(q.y);
    if (q.x - xf < -0.05 && Math.abs(q.z) < hf - 0.05) console.log(o.geometry.type, j, q.toArray().map(z => z.toFixed(3)).join(','), 'face', xf.toFixed(3), hf.toFixed(3)); } });

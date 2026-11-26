const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2], ID = process.argv[3];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const v = V.find(x => x.id === ID), THREE = ctx.THREE;
const g = ctx.SHIPS_HULL.buildShip(v.hull, { fine: true }); g.updateMatrixWorld(true);
const cg = g.children.find(o => o.userData.capstanStation);
const cx = (0.62 - 0.5) * v.hull.lwl; console.log('cap x', cx, 'y', cg.position.y, cg.userData.capstanStation);
const P = new THREE.Vector3();
g.traverse(o => { if (!o.isMesh) return; let e = o; while (e && !(e.userData && e.userData.part)) e = e.parent;
  if (!e || e.userData.part.key !== 'mast') return;
  const A = o.geometry.attributes.position; let best = 1e9, bp = null;
  for (let i = 0; i < A.count; i++) { P.fromBufferAttribute(A, i).applyMatrix4(o.matrixWorld); const r = Math.hypot(P.x - cx, P.z); if (r < best) { best = r; bp = P.clone(); } }
  if (best < 3) console.log(o.name, e === o ? 'self' : 'parent:' + e.name, 'r', best.toFixed(2), 'at', bp.x.toFixed(2), bp.y.toFixed(2), bp.z.toFixed(2), 'verts', A.count, o.geometry.type);
});

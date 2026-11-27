const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
const S = __V.find(x => x.id === 'ship-of-the-line').hull;
const g = SHIPS_HULL.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
const v = new THREE.Vector3(), out = {};
g.traverse(o => { if (!o.isMesh) return; let key = null; for (let p = o; p && !key; p = p.parent) key = p.userData.part && p.userData.part.key;
  if (!/mast/i.test(key || '')) return; const a = o.geometry.attributes.position; let lo = 1e9, xs = 0, n = 0;
  for (let j = 0; j < a.count; j++) { v.fromBufferAttribute(a, j).applyMatrix4(o.matrixWorld); if (v.y < lo) lo = v.y; if (Math.abs(v.y - 4.9) < 0.3) { xs += v.x; n++; } }
  (out[key] = out[key] || []).push([lo.toFixed(2), n ? (xs / n).toFixed(2) : '-', o.name || '']); });
for (const [k, a] of Object.entries(out)) console.log(k, a.length, JSON.stringify(a.slice(0, 8)));
`, ctx);

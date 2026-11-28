// usage: node r376_aftu.js <webdir> — uHawseU (aftU) and the first class port's fore edge per hawse hull
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
for (const V of __V) { const S = V.hull; if (!S.hawse) continue;
  const g = SHIPS_HULL.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
  let U = null; g.traverse(o => { if (U === null && o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uHawseU) U = o.material.uniforms.uHawseU.value; });
  let k = 0; while ((k + 0.2) / 26 < U) k++;
  console.log(V.id, 'uHawseU', U.toFixed(4), 'first class slot k', k, 'fore edge u', ((k + 0.2) / 26).toFixed(4), 'x', ((k + 0.2) / 26 * S.lwl - S.lwl / 2).toFixed(2));
}`, ctx);

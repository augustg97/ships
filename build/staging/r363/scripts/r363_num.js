const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
vm.runInContext(`
const V = __V;
const S = V.find(x => x.id === 'ship-of-the-line').hull;
const H = hullSurface(S);
const T = sideBands(S).tiers;
console.log('tiers', JSON.stringify(T));
for (const u of [0.15, 0.3, 0.5, 0.7, 0.85]) {
  const y = v => surfacePoint(S, H, u, v)[1];
  console.log('u', u, 'deck', H.deck(u).toFixed(3), 'sheer', H.sheer(u).toFixed(3), 'upper port c', y(T[1].port).toFixed(3), 'lo', y(T[1].port-0.023).toFixed(3), 'hi', y(T[1].port+0.023).toFixed(3), 'lower c', y(T[0].port).toFixed(3), 'band1', y(T[1].lo).toFixed(3), y(T[1].hi).toFixed(3));
}
const len = S.beam*0.19, r = S.beam*0.017; const pr = gunBarrelProfile(len, r);
console.log('len', len, 'r', r, Object.keys(pr), pr.pts.length);
console.log('r at face (2/3 len from base)', gunBarrelRadiusAt(len, r, len*2/3 - len*2/3).toFixed(3), gunBarrelRadiusAt(len, r, 0).toFixed(3), gunBarrelRadiusAt(len, r, len/2).toFixed(3));
`, Object.assign(ctx, { __V: JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels }));

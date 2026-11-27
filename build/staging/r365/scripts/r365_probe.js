const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
const S = __V.find(x => x.id === 'ship-of-the-line').hull, H = hullSurface(S);
const R = tierPortRows(S); console.log('rows', JSON.stringify(R));
for (const u of [0.115, 0.3, 0.5, 0.556, 0.85]) {
  const sh = H.sheer(u), sp = surfacePoint(S, H, u, 1), r1 = R[1];
  const hd = surfacePoint(S, H, u, r1.hi)[1], sl = surfacePoint(S, H, u, r1.lo)[1];
  const r0 = R[0]; const hd0 = surfacePoint(S, H, u, r0.hi)[1], sl0 = surfacePoint(S, H, u, r0.lo)[1];
  console.log('u', u, 'sheer', sh.toFixed(3), 'top', sp[1].toFixed(3), 'half', sp[2].toFixed(3), 'upper port', sl.toFixed(3), hd.toFixed(3), 'lower port', sl0.toFixed(3), hd0.toFixed(3), 'deckY', (typeof deckYAt==='function'? deckYAt(S,H,u):'?'));
}
for (const [mi, mk] of S.masts.entries()) { const F = shroudFeet(S, H, mk, true); console.log('mast', mi, 'chan', JSON.stringify(F.chan), 'xs', F.xs.map(x=>x.toFixed(2)).join(','), 'deY', F.y.toFixed(3), 'r', F.r.toFixed(3), 'z', F.z.toFixed(3)); }
console.log('deck', JSON.stringify(S.deck).slice(0,300));
`, ctx);

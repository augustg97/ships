const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
const V = __V.find(v => v.id === 'ship-of-the-line'), S = V.hull, H = hullSurface(S);
const sb = sideBands(S); console.log('bands', JSON.stringify(sb));
for (const x of [-22, -20.06, -19]) { const u = uAtXV(S, H, x, 1, x / S.lwl + 0.5);
  const yv = v => +surfacePoint(S, H, u, v)[1].toFixed(3);
  console.log('x', x, 'u', u.toFixed(4), 'sheer', yv(1), 'islandTop', H.islandTop(u), 'islandDeck', H.islandDeck ? H.islandDeck(u) : null, 'deck', H.deck(u).toFixed(3),
    'wales', JSON.stringify(sb.wales.map(w => [yv(w.v0), yv(w.v0 + w.thick)])), 'z', surfacePoint(S, H, u, 1)[2].toFixed(3)); }
console.log('islands', JSON.stringify(S.islands).slice(0, 400));
`, ctx);

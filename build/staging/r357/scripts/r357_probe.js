const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const SH = ctx.SHIPS_HULL, THREE = ctx.THREE;
for (const id of (process.argv[3] || 'ship-of-the-line').split(',')) {
  const v = V.find(x => x.id === id); const S = v.hull; const H = SH.hullSurface(S);
  console.log('==', id, 'B', S.beam, 'L', S.lwl, 'depth', S.depth, 'keys', Object.keys(S).filter(k=>/draft|draught|depth|deck|island|quarter/i.test(k)).join(','));
  console.log(' sheer(1)', H.sheer(1).toFixed(2), 'deck(0.95)', H.deck(0.95).toFixed(2), 'deck(1)', H.deck(1).toFixed(2), 'islandTop(1)', H.islandTop ? H.islandTop(1) : null, 'islandTop(0.9)', H.islandTop ? H.islandTop(0.9) : null);
  for (const u of [0.80,0.85,0.88,0.9,0.92,0.94,0.96,0.98,1.0]) {
    const row = [0.3,0.5,0.7,0.8,0.9,1.0].map(vv => SH.surfacePoint(S, H, u, vv).map(z=>z.toFixed(2)).join('/'));
    console.log(' u', u, row.join('  '));
  }
  console.log(' keel y', SH.surfacePoint(S,H,0.5,0)[1].toFixed(2));
  if (S.deck) console.log(' deck rec', JSON.stringify(S.deck).slice(0,600));
  if (S.side) console.log(' side rec keys', Object.keys(S.side).join(','));
}

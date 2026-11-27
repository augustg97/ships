const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
for (const id of ['ship-of-the-line', 'east-indiaman']) {
  const v = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels.find(x => x.id === id);
  const S = v.hull, SH = ctx.SHIPS_HULL, H = SH.hullSurface(S);
  const T = SH.sideBands ? SH.sideBands(S).tiers : null;
  console.log(id, 'exports sideBands', !!SH.sideBands, 'deckProvenance?', String(JSON.stringify(S.deck)).slice(0, 200));
  for (const u of [0.2, 0.35, 0.5, 0.65, 0.8]) {
    const out = [];
    (T || []).forEach((t, d) => { const p = SH.surfacePoint(S, H, u, t.port); out.push(`tier${d} y ${p[1].toFixed(2)} z ${Math.abs(p[2]).toFixed(2)}`); });
    console.log(' u', u, 'deck', H.deck(u).toFixed(2), 'sheer', H.sheer(u).toFixed(2), out.join(' | '));
  }
}

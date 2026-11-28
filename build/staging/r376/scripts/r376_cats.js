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
for (const V of __V) { const S = V.hull; if (S.iron) continue;
  try { SHIPS_HULL.buildShip(S, { fine: true }); console.log(V.id, 'catheads', (S.__catheads || []).length, 'year', S.year, 'gunDecks', S.gunDecks); }
  catch (e) { console.log(V.id, 'ERR', e.message.slice(0, 60)); } }`, ctx);

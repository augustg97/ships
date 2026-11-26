const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__t = 0; ctx.__now = () => Number(process.hrtime.bigint() / 1000n) / 1000;
vm.runInContext(`const __s = seatClassCapstans; seatClassCapstans = function (a, b, c) { const t = __now(); __s(a, b, c); __t += __now() - t; };`, ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
for (const v of V) { if (!v.hull || !v.hull.capstan || v.hull.capstan.form === 'spill' || v.hull.capstan.stations) continue;
  ctx.__t = 0; const t = ctx.__now(); const g = ctx.SHIPS_HULL.buildShip(v.hull, { fine: true });
  console.log(v.id.padEnd(16), 'build', (ctx.__now() - t).toFixed(0), 'ms; seat', ctx.__t.toFixed(0), 'ms', JSON.stringify(g.userData.capstanUnseated ? 'UNSEATED' : g.children.filter(o => o.userData.capstanStation).map(o => o.userData.capstanStation.u))); }

const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
// capture the obstacles by wrapping capSweepHit
const ids = process.argv.slice(3);
vm.runInContext(`
var __map = null;
const __orig = capSweepHit;
capSweepHit = function (obs, cx, B) { if (__map) __map.push([cx, (function(){ const o=[]; for (const ob of obs){ const h = __orig([ob], cx, B); if (h) o.push(h);} return o; })()]); return __orig(obs, cx, B); };
`, ctx);
for (const v of V) {
  if (ids.length && !ids.includes(v.id)) continue;
  if (!v.hull || !v.hull.capstan || v.hull.capstan.form === 'spill' || v.hull.capstan.stations) continue;
  ctx.__map = [];
  ctx.SHIPS_HULL.buildShip(v.hull, { fine: true });
  const L = v.hull.lwl, rows = ctx.__map.map(([cx, h]) => [+(0.5 + cx / L).toFixed(3), [...new Set(h.map(k => k.split('/')[1]))]]).sort((a, b) => a[0] - b[0]);
  const masts = (v.hull.masts || []).map(m => m.at);
  console.log('##', v.id, 'L', L, 'masts', JSON.stringify(masts));
  let last = '';
  for (const [u, h] of rows) { const s = h.join(','); if (s !== last) { console.log('  u', u, s || 'CLEAR'); last = s; } }
}

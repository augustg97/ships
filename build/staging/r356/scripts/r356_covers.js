const vm = require('vm'), fs = require('fs');
const ctx = { console: { log: console.log, warn() {} }, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
for (const v of V) { let g; try { g = ctx.SHIPS_HULL.buildShip(v.hull, { fine: true }); } catch (e) { continue; }
  let cv = null, n = 0; g.traverse(o => { if (o.isMesh && o.material.userData && o.material.userData.covers) cv = o.material.userData.covers; });
  if (cv && cv.length) for (const c of cv) console.log(v.id, c.from, c.name, c.x0.toFixed(2), c.x1.toFixed(2), 'y', c.y.toFixed(2), 'open', c.open, 'endIn', c.endIn, 'endOff', c.endOff.toFixed(3), 'lean', c.endLean.toFixed(3), "side", c.sideFrom, JSON.stringify(c.side), "st0", c.st[3].map(x=>x.toFixed(3)).join(","), 'litN', g.userData.coverLitN); }

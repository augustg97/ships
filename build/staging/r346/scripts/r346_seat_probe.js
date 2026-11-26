const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const SH = ctx.SHIPS_HULL;
for (const v of V) {
  if (!v.hull || !v.hull.capstan || v.hull.capstan.form === 'spill') continue;
  for (const opts of [{ fine: true }, { fine: true, furled: true }]) {
    const t0 = Date.now();
    let g; try { g = SH.buildShip(v.hull, opts); } catch (e) { console.log(v.id, 'ERR', e.message); continue; }
    const caps = g.children.filter(o => o.userData.capstanStation);
    console.log(v.id.padEnd(18), opts.furled ? 'furled' : 'set   ', (Date.now() - t0) + 'ms',
      caps.map(c => JSON.stringify({ u: c.userData.capstanStation.u, seat: c.userData.capstanStation.seat })).join(' '));
  }
}

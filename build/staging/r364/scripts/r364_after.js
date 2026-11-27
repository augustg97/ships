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
const P = steelPerpendiculars(S, H); console.log('perp', JSON.stringify(P));
const st = tierPortStations(S); console.log('tiers', st.map(t => t ? t.ports.length : null));
const p1 = st[1].ports; console.log('first', JSON.stringify(p1[0]), 'last', JSON.stringify(p1[p1.length - 1]));
const g = SHIPS_HULL.buildShip(S, { fine: true }); const tg = [];
g.traverse(o => { if (o.userData.tierGun && o.userData.tierGun.deck === 1 && o.position.z > 0) tg.push(o.position.x.toFixed(2)); });
console.log('upper-tier guns x (port side)', tg.length, tg.join(' '));
let hm = null; g.traverse(n => { if (!hm && n.material && n.material.uniforms && n.material.uniforms.uRecPort) hm = n.material; });
console.log('uRecPortN', hm.uniforms.uRecPortN.value, 'rec', JSON.stringify(hm.uniforms.uTierPortRec.value));
const E = __V.find(x => x.id === 'east-indiaman'); if (E) { const ge = SHIPS_HULL.buildShip(E.hull, { fine: true }); let n = 0; ge.traverse(o => { if (o.userData.tierGun) n++; }); console.log('indiaman tier guns', n); }
`, ctx);

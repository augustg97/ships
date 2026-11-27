// every hull, fine and furled: a hash of every mesh's world positions, per hull
const vm = require('vm'), fs = require('fs'), crypto = require('crypto');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const SH = ctx.SHIPS_HULL, THREE = ctx.THREE, P = new THREE.Vector3();
for (const v of V) {
  if (!v.hull) continue;
  let g; try { g = SH.buildShip(v.hull, { fine: true }); } catch (e) { continue; }
  const names = {};
  g.traverse(o => { if (o.isMesh && o.material && o.material.userData && o.material.userData.coverLit) {
    let nm = o.name || ''; for (let p = o; p && !nm; p = p.parent) nm = (p.userData && p.userData.part && (p.userData.part.name || p.userData.part.key)) || p.name || '';
    names[nm || '?'] = (names[nm || '?'] || 0) + 1; } });
  if (g.userData.coverLitN || Object.keys(names).length) console.log(v.id, g.userData.coverLitN, JSON.stringify(names));
}
console.log('done');

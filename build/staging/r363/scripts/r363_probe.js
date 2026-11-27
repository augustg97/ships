const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
const S = __V.find(x => x.id === 'ship-of-the-line').hull;
console.log('rows', JSON.stringify(tierPortRows(S)));
const g = SHIPS_HULL.buildShip(S, { fine: true });
const seen = {};
g.traverse(o => { const t = o.userData.tierGun || o.userData.islandGun; if (!t || !t.laid) return;
  const k = t.laid.rule; seen[k] = seen[k] || []; seen[k].push(t); });
for (const [k, a] of Object.entries(seen)) {
  const len = a[0].lenM, r = len / 0.19 * 0.017;
  const rf = gunBarrelRadiusAt(len, r, len * 2 / 3);
  console.log(k, 'n', a.length, JSON.stringify(a[0].laid), 'rFace', rf.toFixed(3));
  const cl = a.map(t => [t.laid.axis - rf - t.laid.sill, t.laid.head - (t.laid.axis + rf)]);
  console.log('  clearance under (min,max)', Math.min(...cl.map(c=>c[0])).toFixed(3), Math.max(...cl.map(c=>c[0])).toFixed(3), 'over', Math.min(...cl.map(c=>c[1])).toFixed(3), Math.max(...cl.map(c=>c[1])).toFixed(3));
}
const rz=[];g.traverse(o=>{const t=o.userData.islandGun;if(t&&t.laid)rz.push(t.laid.raisedM)});console.log("raisedM",Math.min(...rz),Math.max(...rz));
`, ctx);

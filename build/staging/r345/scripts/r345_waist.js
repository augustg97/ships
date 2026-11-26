// list every part of a hull whose world bbox crosses an x window: node r345_waist.js <web> <id> <x0> <x1>
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const [W, id, x0, x1] = process.argv.slice(2);
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const v = V.find(v => v.id === id), THREE = ctx.THREE;
const g = ctx.SHIPS_HULL.buildShip(v.hull, { fine: true }); g.updateMatrixWorld(true);
const agg = {};
g.traverse(o => { if (!o.isMesh) return; let p = o, k = null; while (p && !k) { k = p.userData.part && p.userData.part.key; p = p.parent; }
  const b = new THREE.Box3().setFromObject(o); if (b.max.x < +x0 || b.min.x > +x1) return;
  const key = (k || "?") + "/" + (o.name || "") + (process.env.SPLIT ? "#" + (o.userData.part ? o.userData.part.name : "") + "#" + o.id : "");
  const a = agg[key] || (agg[key] = { n: 0, b: new THREE.Box3() }); a.n++; a.b.union(b); });
for (const [k, a] of Object.entries(agg)) console.log(k.padEnd(34), a.n, 'x', a.b.min.x.toFixed(2), a.b.max.x.toFixed(2), 'y', a.b.min.y.toFixed(2), a.b.max.y.toFixed(2), 'z', a.b.min.z.toFixed(2), a.b.max.z.toFixed(2));

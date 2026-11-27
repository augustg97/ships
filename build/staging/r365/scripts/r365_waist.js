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
const g = SHIPS_HULL.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
const keyOf = o => { for (let p = o; p; p = p.parent) if (p.userData.part) return p.userData.part.key; return null; };
const v = new THREE.Vector3(); const r = {};
g.traverse(o => { if (!o.isMesh) return; const k = keyOf(o); const a = o.geometry.attributes.position; if (!a) return;
  for (let j=0;j<a.count;j++){ v.fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld); if (Math.abs(v.x-5)>0.6 || v.z < 4) continue;
    r[k] = r[k] || [1e9,-1e9,0]; r[k][0]=Math.min(r[k][0],v.y); r[k][1]=Math.max(r[k][1],v.y); r[k][2]=Math.max(r[k][2],v.z); } });
for (const [k,q] of Object.entries(r)) console.log(k, q.map(x=>x.toFixed(2)).join(' '));
console.log('sheer', H.sheer(0.6).toFixed(3), 'deck', H.deck(0.6).toFixed(3), 'islandRailM', JSON.stringify(H.islandRailM ? H.islandRailM(0.6) : null));
`, ctx);

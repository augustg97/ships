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
const v = V.find(x => x.id === 'ship-of-the-line'); const g = SH.buildShip(v.hull, { fine: true }); g.updateMatrixWorld(true);
let cv; g.traverse(o => { if (o.isMesh && o.material.userData && o.material.userData.covers) cv = o.material.userData.covers; });
const q = cv.find(c => c.name !== 'Forecastle' && c.open < 0) || cv[1]; console.log('cover', q.name, q.x0, q.x1, q.y);
g.traverse(o => { if (!o.isMesh || !(o.material.userData && o.material.userData.coverLit)) return;
  let nm = o.name || ''; for (let pp = o; pp && !nm; pp = pp.parent) nm = (pp.userData && pp.userData.part && (pp.userData.part.name || pp.userData.part.key)) || pp.name || '';
  const a = o.geometry.attributes.position, P = new THREE.Vector3(); let xm = -1e9, xn = 1e9, ym = -1e9, yn = 1e9, zm = 0;
  for (let i = 0; i < a.count; i++) { P.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); if (P.x > q.x1 - 2) { xm = Math.max(xm, P.x); xn = Math.min(xn, P.x); ym = Math.max(ym, P.y); yn = Math.min(yn, P.y); zm = Math.max(zm, Math.abs(P.z)); } }
  if (xm > -1e9) console.log(nm.padEnd(22), 'x', xn.toFixed(2), xm.toFixed(2), 'y', yn.toFixed(2), ym.toFixed(2), '|z|<', zm.toFixed(2)); });

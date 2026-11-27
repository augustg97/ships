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
for (const c of cv) console.log(c.name, c.x0.toFixed(2), c.x1.toFixed(2), 'y', c.y.toFixed(2), 'st', c.st.map(q => q.map(z => z.toFixed(2)).join('/')).join(' '));
g.traverse(o => { if (!o.isMesh) return; let nm = o.name || ''; for (let pp = o; pp && !nm; pp = pp.parent) nm = (pp.userData && pp.userData.part && (pp.userData.part.name || pp.userData.part.key)) || pp.name || ''; if (!/Quarter galleries|Transom|Channels|Deadeyes/.test(nm)) return;
  const a = o.geometry.attributes.position, P = new THREE.Vector3(); let n = 0, k = 0, ex = [];
  for (let i = 0; i < a.count; i++) { P.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); n++;
    for (const c of cv) { if (P.x < c.x0 || P.x > c.x1 || P.y > c.y - 0.05) continue;
      const t = Math.min(6.999, (P.x - c.x0) / (c.x1 - c.x0) * 7), j = Math.floor(t), f = t - j; const q = [0,1,2].map(m => c.st[j][m] + (c.st[j+1][m] - c.st[j][m]) * f);
      if (P.y < q[2] - 0.05) continue; const hw = q[0] + (q[1] - q[0]) * Math.max(0, Math.min(1, (P.y - q[2]) / Math.max(c.y - q[2], 0.1)));
      if (Math.abs(P.z) < hw) { k++; if (ex.length < 4) ex.push([P.x, P.y, P.z, hw].map(z => z.toFixed(2)).join(',')); } } }
  if (k) console.log(nm, k, '/', n, ex.join(' | ')); });

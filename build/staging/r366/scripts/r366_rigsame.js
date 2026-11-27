// r366: hash every non-anchor mesh's vertices on every hull, for two hull.js files
const vm = require('vm'), fs = require('fs');
function run(hullFile) {
  const ctx = { console: { log(){}, warn(){} }, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('web/js/three.min.js', 'utf8'), ctx); vm.runInContext(fs.readFileSync('web/js/shaders.js', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(hullFile, 'utf8'), ctx);
  ctx.__V = JSON.parse(fs.readFileSync('web/data/vessels.json', 'utf8')).vessels;
  return vm.runInContext(`(() => { const out = {};
    for (const V of __V) { if (!V.hull) continue; let g; try { g = SHIPS_HULL.buildShip(V.hull, { fine: true }); } catch (e) { out[V.id] = 'ERR'; continue; }
      g.updateMatrixWorld(true); let h = 0, n = 0; const v = new THREE.Vector3();
      const anc = o => { for (let p = o; p; p = p.parent) if (p.userData.part && p.userData.part.key === 'anchor') return true; return false; };
      g.traverse(o => { if (!o.isMesh || anc(o) || !o.geometry.attributes.position) return; const a = o.geometry.attributes.position;
        for (let j = 0; j < a.count; j++) { v.fromBufferAttribute(a, j).applyMatrix4(o.matrixWorld); h = (h * 31 + Math.round(v.x * 1000) * 7 + Math.round(v.y * 1000) * 13 + Math.round(v.z * 1000)) % 1000000007; n++; } });
      out[V.id] = n + ':' + h; } return out; })()`, ctx);
}
const A = run(process.argv[2]), B = run(process.argv[3]);
let diff = 0; for (const k in A) if (A[k] !== B[k]) { diff++; console.log('DIFF', k, A[k], B[k]); }
console.log(Object.keys(A).length, 'hulls,', diff, 'differ outside the anchors');

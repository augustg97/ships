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
    for (const id of ['clipper','wyoming','endurance','ship-of-the-line']) { const V = __V.find(v => v.id === id); const g = SHIPS_HULL.buildShip(V.hull, { fine: true });
      const c = {}; g.updateMatrixWorld(true); const cp = []; g.traverse(o => { if (o.userData.part && o.userData.part.key === "capstan" && !o.parent.userData.part) { const b = new THREE.Box3().setFromObject(o); cp.push(b.min.x.toFixed(2)+".."+b.max.x.toFixed(2)+" y"+b.max.y.toFixed(2)); } }); c.__cap = cp.join("|") + " uns " + JSON.stringify(g.userData.capstanUnseated); g.traverse(o => { if (o.userData.part) c[o.userData.part.key] = (c[o.userData.part.key] || 0) + 1; });
      out[id] = JSON.stringify(c); } return out; })()`, ctx);
}
const A = run(process.argv[2]), B = run(process.argv[3]);
for (const k in A) { const a = JSON.parse(A[k]), b = JSON.parse(B[k]); const d = []; for (const q of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[q] !== b[q]) d.push(q + ' ' + a[q] + '→' + b[q]); console.log(k, a.__cap, "||", b.__cap, d.join('; ') || 'same part counts'); }

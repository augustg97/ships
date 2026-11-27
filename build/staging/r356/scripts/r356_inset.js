// usage: node r356_inset.js <web dir> — for named parts on the 74, the distance of their vertices inside the shell at their own height and station
const vm = require('vm'), fs = require('fs');
const ctx = { console: { log: console.log, warn() {} }, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2], names = process.argv.slice(3);
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const T = ctx.THREE, SH = ctx.SHIPS_HULL;
const v = V.find(q => q.id === 'ship-of-the-line'), H = v.hull, g = SH.buildShip(H, { fine: true }), HS = SH.hullSurface(H), L = H.lwl;
const xAt = u => (u - 0.5) * L + HS.rake(Math.max(0.001, Math.min(0.999, u)));
const uOf = x => { let a = 0, b = 1; for (let j = 0; j < 30; j++) { const m = (a + b) / 2; if (xAt(m) < x) a = m; else b = m; } return (a + b) / 2; };
const halfAt = (u, y) => { if (y >= HS.sheer(u)) return Math.abs(SH.surfacePoint(H, HS, u, 1.0)[2]);
  let a = 0, b = 1; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (SH.surfacePoint(H, HS, u, m)[1] < y) a = m; else b = m; }
  return Math.abs(SH.surfacePoint(H, HS, u, (a + b) / 2)[2]); };
g.updateMatrixWorld(true);
const invP = new T.Matrix4().copy(g.matrixWorld).invert(), Mm = new T.Matrix4(), Mi = new T.Matrix4(), q = new T.Vector3(), out = {};
g.traverse(o => { if (!o.isMesh) return;
  let nm = o.name || ''; for (let pp = o; pp && !nm; pp = pp.parent) nm = (pp.userData && pp.userData.part && (pp.userData.part.name || pp.userData.part.key)) || pp.name || '';
  if (!names.some(n => nm.startsWith(n))) return;
  const a = o.geometry.attributes.position, nI = o.isInstancedMesh ? o.count : 1, r = out[nm] = out[nm] || [];
  for (let i = 0; i < nI; i++) { Mm.multiplyMatrices(invP, o.matrixWorld); if (o.isInstancedMesh) { o.getMatrixAt(i, Mi); Mm.multiply(Mi); }
    for (let j = 0; j < a.count; j += Math.max(1, Math.floor(a.count / 400))) { q.fromBufferAttribute(a, j).applyMatrix4(Mm);
      if (q.x < -3.6 || q.x > 25) continue;   // under the quarterdeck, clear of the stern
      const u = uOf(q.x); r.push(halfAt(u, q.y) - Math.abs(q.z)); } } });
for (const [k, r] of Object.entries(out)) { r.sort((a, b) => a - b); if (!r.length) continue;
  console.log(k.padEnd(28), 'n', r.length, 'inset min', r[0].toFixed(3), 'p10', r[Math.floor(r.length * .1)].toFixed(3), 'median', r[Math.floor(r.length / 2)].toFixed(3), 'max', r[r.length - 1].toFixed(3)); }

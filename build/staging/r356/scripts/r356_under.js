// usage: node r356_under.js <web dir> — vertices of each scene-lit part counted under a cover, by part name (the shader's test)
const vm = require('vm'), fs = require('fs');
const ctx = { console: { log: console.log, warn() {} }, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const T = ctx.THREE, SH = ctx.SHIPS_HULL;
for (const id of ['ship-of-the-line', 'carrack']) {
  const v = V.find(q => q.id === id), H = v.hull, g = SH.buildShip(H, { fine: true }), HS = SH.hullSurface(H);
  let covM = null; g.traverse(o => { if (o.isMesh && o.material.userData && o.material.userData.covers && o.material.userData.covers.length) covM = o.material; });
  const cvs = covM.userData.covers;
  const skinEnd = (uE, y) => { let a = 0, b = 1; if (SH.surfacePoint(H, HS, uE, 1.0)[1] <= y) a = b = 1;
    for (let i = 0; i < 26 && a < b; i++) { const m = (a + b) / 2; if (SH.surfacePoint(H, HS, uE, m)[1] < y) a = m; else b = m; }
    return SH.surfacePoint(H, HS, uE, (a + b) / 2)[0]; };
  const under = q2 => cvs.some(c => { if (q2.x < c.x0 || q2.x > c.x1 || q2.y > c.y - 0.05) return false;
    if (c.endIn) { const xe = skinEnd(c.open < 0 ? 1 : 0, q2.y); if (c.open < 0 ? q2.x > xe - c.endIn : q2.x < xe + c.endIn) return false; }
    const t = Math.min(6.999, (q2.x - c.x0) / Math.max(c.x1 - c.x0, 1e-3) * 7), k = Math.floor(t), f = t - k;
    const st = [0, 1, 2].map(j => c.st[k][j] + (c.st[k + 1][j] - c.st[k][j]) * f);
    if (q2.y < st[2] - 0.05) return false;
    const hw = st[0] + (st[1] - st[0]) * Math.max(0, Math.min(1, (q2.y - st[2]) / Math.max(c.y - st[2], 0.1)));
    return Math.abs(q2.z) < hw; });
  g.updateMatrixWorld(true);
  const invP = new T.Matrix4().copy(g.matrixWorld).invert(), Mi = new T.Matrix4(), Mm = new T.Matrix4(), q = new T.Vector3(), tally = {};
  g.traverse(o => { const m = o.isMesh && o.material; if (!m || Array.isArray(m) || !(m.userData && m.userData.coverLit)) return;
    const a = o.geometry.attributes.position, nI = o.isInstancedMesh ? o.count : 1;
    let nm = o.name || ''; for (let pp = o; pp && !nm; pp = pp.parent) nm = (pp.userData && pp.userData.part && (pp.userData.part.name || pp.userData.part.key)) || pp.name || '';
    const r = tally[nm || '?'] = tally[nm || '?'] || [0, 0];
    for (let i = 0; i < nI; i++) { Mm.multiplyMatrices(invP, o.matrixWorld); if (o.isInstancedMesh) { o.getMatrixAt(i, Mi); Mm.multiply(Mi); }
      for (let j = 0; j < a.count; j++) { q.fromBufferAttribute(a, j).applyMatrix4(Mm); r[1]++; if (under(q)) r[0]++; } } });
  for (const [k, r] of Object.entries(tally).sort()) console.log(id, k, 'under', r[0], 'of', r[1]);
}

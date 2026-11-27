// proof for the leaning closed end: stern-furniture vertices under a cover by r354's vertical end vs r355's skin end
const vm = require('vm'), fs = require('fs');
const ctx = { console: { log: console.log, warn() {} }, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels, SH = ctx.SHIPS_HULL, THREE = ctx.THREE;
for (const id of ['ship-of-the-line', 'carrack']) {
  const v = V.find(x => x.id === id), H = v.hull, g = SH.buildShip(H, { fine: true }); g.updateMatrixWorld(true);
  let cvs; g.traverse(o => { if (o.isMesh && o.material.userData && o.material.userData.covers) cvs = o.material.userData.covers; });
  const mk = lean => q2 => cvs.some(c => { if (q2.x < c.x0 || q2.x > c.x1 || q2.y > c.y - 0.05) return false;
    const xe = (c.open < 0 ? c.x1 : c.x0) + (lean ? c.endOff + (q2.y - c.y) * c.endLean : 0);
    if (c.open < 0 ? q2.x > xe - c.endIn : q2.x < xe + c.endIn) return false;
    const t = Math.min(6.999, (q2.x - c.x0) / (c.x1 - c.x0) * 7), k = Math.floor(t), f = t - k; const st = [0,1,2].map(j => c.st[k][j] + (c.st[k+1][j] - c.st[k][j]) * f);
    if (q2.y < st[2] - 0.05) return false; const hw = st[0] + (st[1] - st[0]) * Math.max(0, Math.min(1, (q2.y - st[2]) / Math.max(c.y - st[2], 0.1))); return Math.abs(q2.z) < hw; });
  const vert = mk(false), lean = mk(true), tally = {}, q = new THREE.Vector3();
  g.traverse(o => { if (!o.isMesh) return; let key = null; for (let pp = o; pp && !key; pp = pp.parent) key = pp.userData && pp.userData.part && pp.userData.part.key;
    const a = o.geometry.attributes.position; if (o.isInstancedMesh) return;
    for (let j = 0; j < a.count; j++) { q.fromBufferAttribute(a, j).applyMatrix4(o.matrixWorld); const A = vert(q), B = lean(q);
      if (A !== B) { const k = key + (A ? ' under by the vertical end only' : ' under by the leaning end only'); tally[k] = (tally[k] || 0) + 1; } } });
  console.log(id, JSON.stringify(tally));
}

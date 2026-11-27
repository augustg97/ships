// the quarter gallery against the hull: corner, side half-breadths forward of it, gallery vertex extents
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const SH = ctx.SHIPS_HULL, THREE = ctx.THREE;
for (const id of (process.argv[3] || 'ship-of-the-line,east-indiaman').split(',')) {
  const v = V.find(x => x.id === id); const S = v.hull; const H = SH.hullSurface(S);
  const g = SH.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
  console.log('==', id, 'B', S.beam, 'L', S.lwl);
  // the stern section at u=1 and u near 1
  for (const vv of [0.62, 0.7, 0.8, 0.9, 1.0]) {
    const p = SH.surfacePoint(S, H, 1.0, vv);
    const q = [0.99, 0.98, 0.96, 0.94].map(u => SH.surfacePoint(S, H, u, vv)).map(r => r.map(z => z.toFixed(2)).join('/'));
    console.log(' v', vv, 'u1', p.map(z => z.toFixed(2)).join('/'), '|', q.join('  '));
  }
  const P = new THREE.Vector3();
  g.traverse(o => { if (!o.isMesh) return; let nm = ''; for (let pp = o; pp && !nm; pp = pp.parent) nm = (pp.userData && pp.userData.part && (pp.userData.part.name || pp.userData.part.key)) || ''; if (!/Quarter galleries/.test(nm)) return;
    const a = o.geometry.attributes.position; const bb = [[1e9,-1e9],[1e9,-1e9],[1e9,-1e9]];
    for (let i = 0; i < a.count; i++) { P.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); [P.x,P.y,P.z].forEach((c,k)=>{bb[k][0]=Math.min(bb[k][0],c);bb[k][1]=Math.max(bb[k][1],c);}); }
    console.log(' gal', o.geometry.type, a.count, bb.map(r => r.map(z => z.toFixed(2)).join('..')).join('  '));
  });
}

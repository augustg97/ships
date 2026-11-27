const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const SH = ctx.SHIPS_HULL, THREE = ctx.THREE;
for (const id of (process.argv[3] || 'ship-of-the-line').split(',')) {
  const v = V.find(x => x.id === id); const S = v.hull;
  const g = SH.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
  console.log('==', id);
  const P = new THREE.Vector3(); let shown = false;
  g.traverse(o => { if (!o.isMesh) return; let key = ''; for (let pp = o; pp && !key; pp = pp.parent) key = (pp.userData && pp.userData.part && pp.userData.part.key) || '';
    if (!/gallery|sternlight|transom|taffrail/.test(key)) return;
    if (o.userData.quarterGallery && !shown) { console.log(JSON.stringify(o.userData.quarterGallery)); shown = true; }
    const a = o.geometry.attributes.position; const bb = [[1e9,-1e9],[1e9,-1e9],[1e9,-1e9]];
    for (let i = 0; i < a.count; i++) { P.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); [P.x,P.y,P.z].forEach((c,k)=>{bb[k][0]=Math.min(bb[k][0],c);bb[k][1]=Math.max(bb[k][1],c);}); }
    if (bb[2][0] < 0 && key === 'gallery' && o.geometry.type === 'BoxGeometry') return;
    console.log(' ', key, o.geometry.type, a.count, bb.map(r => r.map(z => z.toFixed(2)).join('..')).join('  '));
  });
}

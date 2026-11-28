const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
for (const f of ['three.min.js','shaders.js','hull.js']) vm.runInContext(fs.readFileSync(process.argv[2] + '/js/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(process.argv[2] + '/data/vessels.json', 'utf8'));
const list = (V.vessels || V); const T = ctx.THREE;
const id = process.argv[3] || 'east-indiaman';
const v = list.find(x => x.id === id);
const g = ctx.SHIPS_HULL.buildShip(v.hull, { fine: true }); g.updateMatrixWorld(true);
const key = o => (o.userData.part && o.userData.part.key) || o.userData.key || o.name || o.type;
const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
const ck = meshes.filter(o => o.userData.headCheek && o.userData.headCheek.sgn > 0);
for (const m of ck) {
  const p = m.geometry.attributes.position; const n = p.count / 4;
  for (const k of [3, 8, 13, 20]) {
    const b = k * 4; const q = i => [p.getX(b+i), p.getY(b+i), p.getZ(b+i)];
    const oLo = q(1), oHi = q(2), iLo = q(0);
    const c = [(oLo[0]+oHi[0])/2, (oLo[1]+oHi[1])/2, (oLo[2]+oHi[2])/2];
    const rc = new T.Raycaster(new T.Vector3(c[0], c[1], c[2] + 6), new T.Vector3(0, 0, -1));
    const hits = rc.intersectObjects(meshes, false).filter(h => h.distance < 8).slice(0, 4);
    console.log(m.userData.headCheek.which, 'st', k, 'x', c[0].toFixed(2), 'y', c[1].toFixed(2), 'inZ', iLo[2].toFixed(3), 'outZ', c[2].toFixed(3),
      '|', hits.map(h => key(h.object) + '@z' + (c[2] + 6 - h.distance).toFixed(3)).join(' , '));
  }
}
